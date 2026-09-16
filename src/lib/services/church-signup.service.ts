import { createAdminClient } from "@/lib/supabase/admin";
import { tenantOrigin } from "@/lib/tenant/config";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import { churchSignupSchema } from "@/lib/validators/church-signup.schema";

const DEFAULT_GIVING_CATEGORIES = [
  { name: "Tithe", description: "Regular tithe giving" },
  { name: "Offering", description: "General offering" },
  { name: "Building Fund", description: "Capital and building projects" },
  { name: "Missions", description: "Local and international missions" },
  { name: "Other", description: "Other designated giving" },
] as const;

function signupErrorMessage(code?: string, message?: string) {
  const normalized = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  if (normalized.includes("already") || normalized.includes("registered") || code === "user_already_exists") {
    return "An account with this email already exists. Sign in at your church address.";
  }
  if (code === "weak_password") {
    return "Choose a stronger password.";
  }
  if (normalized.includes("invalid") && normalized.includes("email")) {
    return "Enter a valid email address.";
  }
  return "Unable to create that church. Please try again.";
}

async function rollbackOrganization(organizationId: string, userId?: string) {
  const admin = createAdminClient();
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch((error) => {
      logServerError("church-signup.rollback.user", error);
    });
  }
  await admin.from("giving_categories").delete().eq("organization_id", organizationId);
  await admin.from("user_roles").delete().eq("organization_id", organizationId);
  await admin.from("profiles").delete().eq("organization_id", organizationId);
  await admin.from("locations").delete().eq("organization_id", organizationId);
  await admin.from("organizations").delete().eq("id", organizationId);
}

export async function createChurchOrganization(input: unknown) {
  const parsed = churchSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const admin = createAdminClient();
  const { data: existingSlug, error: slugError } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();

  if (slugError) {
    logServerError("church-signup.slug", slugError);
    return { error: "Unable to check that church address. Please try again." };
  }
  if (existingSlug) {
    return { error: "That church address is already taken. Choose another." };
  }

  const { data: existingCode, error: codeError } = await admin
    .from("organizations")
    .select("id")
    .eq("short_code", parsed.data.short_code)
    .maybeSingle();

  const shortCodeAvailable = !codeError?.message.toLowerCase().includes("short_code");
  if (codeError && shortCodeAvailable) {
    logServerError("church-signup.short-code", codeError);
    return { error: "Unable to check that church code. Please try again." };
  }
  if (shortCodeAvailable && existingCode) {
    return { error: "That church code is already taken. Choose another." };
  }

  const orgPayload = {
    name: parsed.data.organization_name,
    slug: parsed.data.slug,
    email: parsed.data.email,
    ...(shortCodeAvailable ? { short_code: parsed.data.short_code } : {}),
  };

  const { data: orgRow, error: orgError } = await admin
    .from("organizations")
    .insert(orgPayload as never)
    .select("id")
    .maybeSingle();

  if (orgError || !orgRow) {
    logServerError("church-signup.organization", orgError);
    if (orgError?.message.toLowerCase().includes("organizations_slug")) {
      return { error: "That church address is already taken. Choose another." };
    }
    if (orgError?.message.toLowerCase().includes("short_code_key") || orgError?.message.toLowerCase().includes("organizations_short_code")) {
      return { error: "That church code is already taken. Choose another." };
    }
    return { error: userSafeDatabaseError(orgError?.message ?? "") };
  }

  const organizationId = String((orgRow as { id: string }).id);

  const { data: locationRow, error: locationError } = await admin
    .from("locations")
    .insert({
      organization_id: organizationId,
      name: parsed.data.location_name,
      code: parsed.data.location_code,
      country: parsed.data.country,
      city: parsed.data.city,
      status: "ACTIVE",
    } as never)
    .select("id")
    .maybeSingle();

  if (locationError || !locationRow) {
    logServerError("church-signup.location", locationError);
    await rollbackOrganization(organizationId);
    return { error: userSafeDatabaseError(locationError?.message ?? "") };
  }

  const locationId = String((locationRow as { id: string }).id);

  const { error: categoriesError } = await admin.from("giving_categories").insert(
    DEFAULT_GIVING_CATEGORIES.map((category) => ({
      organization_id: organizationId,
      name: category.name,
      description: category.description,
      active: true,
    })) as never,
  );

  if (categoriesError) {
    logServerError("church-signup.categories", categoriesError);
    await rollbackOrganization(organizationId);
    return { error: "The church was created, but default giving categories could not be added. Try again." };
  }

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      organization_id: organizationId,
      location_id: locationId,
      registration_source: "org_signup",
    },
  });

  const userId = created.user?.id;
  if (userError || !userId) {
    logServerError("church-signup.user", userError);
    await rollbackOrganization(organizationId);
    return { error: signupErrorMessage(userError?.code, userError?.message) };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      status: "ACTIVE",
      location_id: locationId,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: emptyToNull(""),
    } as never)
    .eq("id", userId)
    .eq("organization_id", organizationId);

  if (profileError) {
    logServerError("church-signup.profile", profileError);
  }

  const { data: roles, error: rolesError } = await admin.from("roles").select("id, name").in("name", ["SUPER_ADMIN", "MEMBER"]);
  if (rolesError) {
    logServerError("church-signup.roles", rolesError);
  }

  const roleRows = (roles ?? []) as Array<{ id: string; name: string }>;
  const superRoleId = roleRows.find((row) => row.name === "SUPER_ADMIN")?.id;
  const memberRoleId = roleRows.find((row) => row.name === "MEMBER")?.id;

  if (memberRoleId) {
    await admin.from("user_roles").delete().eq("user_id", userId).eq("role_id", memberRoleId);
  }

  if (superRoleId) {
    const { data: existingSuper } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role_id", superRoleId)
      .eq("organization_id", organizationId)
      .is("location_id", null)
      .maybeSingle();

    if (!existingSuper) {
      const { error: superError } = await admin.from("user_roles").insert({
        user_id: userId,
        role_id: superRoleId,
        organization_id: organizationId,
        location_id: null,
      } as never);
      if (superError) {
        logServerError("church-signup.super-admin", superError);
        await rollbackOrganization(organizationId, userId);
        return { error: "The church was created, but the administrator role could not be assigned. Try again." };
      }
    }
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    organization_id: organizationId,
    user_id: userId,
    action: "ORGANIZATION_CREATED",
    entity_type: "organization",
    entity_id: organizationId,
    metadata: {
      slug: parsed.data.slug,
      short_code: parsed.data.short_code,
      location_id: locationId,
    },
  } as never);

  if (auditError) {
    logServerError("church-signup.audit", auditError);
  }

  return { ok: true as const, redirectTo: `${tenantOrigin(parsed.data.slug)}/login?reason=church-ready` };
}
