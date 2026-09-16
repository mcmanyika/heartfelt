import { listPageCount } from "@/lib/admin/list-page";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/tenant/get-tenant";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import { signupSchema } from "@/lib/validators/auth.schema";

export const REGISTRATION_PAGE_SIZE = 20;

export type PublicCampus = {
  id: string;
  name: string;
  code: string;
};

export type PendingRegistration = {
  id: string;
  profile_id: string;
  membership_number: string;
  membership_status: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  location_id: string;
  location_name: string;
  location_code: string;
  created_at: string;
};

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function signupErrorMessage(code?: string, message?: string) {
  const normalized = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  if (normalized.includes("already") || normalized.includes("registered") || code === "user_already_exists") {
    return "An account with this email already exists. Sign in, or wait for a campus administrator to activate it.";
  }
  if (code === "over_email_send_rate_limit" || normalized.includes("rate limit")) {
    return "Too many accounts were created just now. Wait a minute and try again.";
  }
  if (code === "weak_password") {
    return "Choose a stronger password.";
  }
  if (normalized.includes("invalid") && normalized.includes("email")) {
    return "Enter a valid email address.";
  }
  return "Unable to create that account. Please try again.";
}

export async function listPublicCampuses() {
  const tenant = await getTenant();
  if (!tenant) {
    return { campuses: [] as PublicCampus[] };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("locations")
      .select("id, name, code, status")
      .eq("organization_id", tenant.id)
      .eq("status", "ACTIVE")
      .order("name");

    if (error) {
      logServerError("registration.campuses", error);
      return { campuses: [] as PublicCampus[] };
    }

    return {
      campuses: ((data ?? []) as Array<{ id: string; name: string; code: string }>).map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
      })),
    };
  } catch (error) {
    logServerError("registration.campuses", error);
    return { campuses: [] as PublicCampus[] };
  }
}

async function finalizePendingRegistration(input: {
  userId: string;
  locationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}) {
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, organization_id, location_id")
    .eq("id", input.userId)
    .maybeSingle();

  if (profileError || !profile) {
    logServerError("registration.finalize.profile", profileError);
    return { error: "Your account was created, but the membership record could not be finished. Contact the campus office." };
  }

  const organizationId = String((profile as { organization_id: string }).organization_id);
  const { error: statusError } = await admin
    .from("profiles")
    .update({
      status: "INACTIVE",
      location_id: input.locationId,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
    } as never)
    .eq("id", input.userId);

  if (statusError) {
    logServerError("registration.finalize.status", statusError);
    if (statusError.message.toLowerCase().includes("only a super admin")) {
      return { error: "Registration is not fully configured on the server yet. Ask an administrator to apply the latest database updates." };
    }
    return { error: "Your account was created, but it could not be held for approval. Contact the campus office." };
  }

  const { data: memberRole } = await admin.from("roles").select("id").eq("name", "MEMBER").maybeSingle();
  const memberRoleId = (memberRole as { id: string } | null)?.id;
  if (memberRoleId) {
    const { error: roleError } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", input.userId)
      .eq("role_id", memberRoleId);
    if (roleError) {
      logServerError("registration.finalize.roles", roleError);
    }
  }

  const { data: existingMembers, error: existingError } = await admin
    .from("members")
    .select("id, profile_id, location_id")
    .eq("organization_id", organizationId)
    .ilike("email", input.email)
    .limit(5);

  if (existingError) {
    logServerError("registration.finalize.existing", existingError);
  }

  const matches = (existingMembers ?? []) as Array<{
    id: string;
    profile_id: string | null;
    location_id: string;
  }>;
  const linkedToOther = matches.find((row) => row.profile_id && row.profile_id !== input.userId);
  if (linkedToOther) {
    return { error: "A membership record with this email already exists. Contact the campus office." };
  }

  const unlinked = matches.find((row) => !row.profile_id);
  if (unlinked) {
    const { error: linkError } = await admin
      .from("members")
      .update({
        profile_id: input.userId,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        email: input.email,
      } as never)
      .eq("id", unlinked.id);
    if (linkError) {
      logServerError("registration.finalize.link", linkError);
      return { error: userSafeDatabaseError(linkError.message) };
    }
    return { ok: true as const };
  }

  const { data: alreadyLinked } = await admin
    .from("members")
    .select("id")
    .eq("profile_id", input.userId)
    .maybeSingle();

  if (alreadyLinked) {
    return { ok: true as const };
  }

  const { error: insertError } = await admin.from("members").insert({
    organization_id: organizationId,
    location_id: input.locationId,
    profile_id: input.userId,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    membership_status: "VISITOR",
    date_joined: todayUtcDate(),
  } as never);

  if (insertError) {
    logServerError("registration.finalize.member", insertError);
    return { error: userSafeDatabaseError(insertError.message) };
  }

  return { ok: true as const };
}

export async function registerMemberAccount(input: unknown) {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const tenant = await getTenant();
  if (!tenant) {
    return { error: "Open your church’s registration page to create an account." };
  }

  const admin = createAdminClient();
  const { data: location, error: locationError } = await admin
    .from("locations")
    .select("id, status, organization_id")
    .eq("id", parsed.data.location_id)
    .eq("organization_id", tenant.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (locationError) {
    logServerError("registration.location", locationError);
    return { error: "Unable to check that campus. Please try again." };
  }
  if (!location) {
    return { error: "Choose a valid campus." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        phone: emptyToNull(parsed.data.phone),
        organization_id: tenant.id,
        location_id: parsed.data.location_id,
        registration_source: "self",
      },
    },
  });

  if (error) {
    logServerError("registration.signup", error);
    return { error: signupErrorMessage(error.code, error.message) };
  }

  const userId = data.user?.id;
  if (!userId) {
    return {
      error:
        "If this email is new, check your inbox to confirm it. If you already registered, wait for a campus administrator to activate your account.",
    };
  }

  const { error: confirmError } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (confirmError) {
    logServerError("registration.confirm", confirmError);
  }

  const finalized = await finalizePendingRegistration({
    userId,
    locationId: parsed.data.location_id,
    firstName: parsed.data.first_name,
    lastName: parsed.data.last_name,
    email: parsed.data.email,
    phone: emptyToNull(parsed.data.phone),
  });

  if (finalized.error) {
    await supabase.auth.signOut();
    return { error: finalized.error };
  }

  await writeAuditLog({
    action: "MEMBER_REGISTRATION_SUBMITTED",
    entityType: "member",
    entityId: userId,
    metadata: { location_id: parsed.data.location_id, email: parsed.data.email },
  });

  await supabase.auth.signOut();
  return { ok: true as const };
}

export async function listPendingRegistrations(query: { page?: number } = {}) {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const selection = await getAdminLocationSelection(current);
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * REGISTRATION_PAGE_SIZE;
  const to = from + REGISTRATION_PAGE_SIZE - 1;
  const supabase = await createClient();

  let request = supabase
    .from("members")
    .select(
      "id, membership_number, membership_status, first_name, last_name, email, phone, created_at, profile_id, location_id, locations(name, code), profiles!inner(id, status, first_name, last_name, phone)",
      { count: "exact" },
    )
    .eq("organization_id", current.organizationId)
    .not("profile_id", "is", null)
    .eq("profiles.status", "INACTIVE")
    .order("created_at", { ascending: false });

  if (selection.locationId) {
    request = request.eq("location_id", selection.locationId);
  } else if (!current.isSuperAdmin) {
    const locationIds = current.staffLocationIds;
    if (locationIds.length === 0) {
      return {
        rows: [] as PendingRegistration[],
        total: 0,
        page,
        pageSize: REGISTRATION_PAGE_SIZE,
        pageCount: 1,
      };
    }
    request = request.in("location_id", locationIds);
  }

  const { data, error, count } = await request.range(from, to);
  if (error) {
    logServerError("registration.list", error);
    return {
      rows: [] as PendingRegistration[],
      total: 0,
      page,
      pageSize: REGISTRATION_PAGE_SIZE,
      pageCount: 1,
      error: "Unable to load registrations.",
    };
  }

  const rows = ((data ?? []) as Array<Record<string, unknown>>).flatMap((row) => {
    const profile = row.profiles as
      | { id: string; status: string; first_name: string; last_name: string; phone: string | null }
      | { id: string; status: string; first_name: string; last_name: string; phone: string | null }[]
      | null;
    const profileRow = Array.isArray(profile) ? profile[0] : profile;
    if (!profileRow || profileRow.status !== "INACTIVE") {
      return [];
    }
    const location = row.locations as
      | { name: string; code: string }
      | { name: string; code: string }[]
      | null;
    const locationRow = Array.isArray(location) ? location[0] : location;
    const firstName = String(profileRow.first_name || row.first_name || "").trim();
    const lastName = String(profileRow.last_name || row.last_name || "").trim();
    return [
      {
        id: String(row.id),
        profile_id: String(row.profile_id),
        membership_number: String(row.membership_number),
        membership_status: String(row.membership_status),
        first_name: firstName,
        last_name: lastName,
        email: (row.email as string | null) ?? null,
        phone: profileRow.phone ?? (row.phone as string | null) ?? null,
        location_id: String(row.location_id),
        location_name: locationRow?.name ?? "Unknown",
        location_code: locationRow?.code ?? "—",
        created_at: String(row.created_at),
      } satisfies PendingRegistration,
    ];
  });

  const total = count ?? rows.length;
  return {
    rows,
    total,
    page,
    pageSize: REGISTRATION_PAGE_SIZE,
    pageCount: listPageCount(total, REGISTRATION_PAGE_SIZE),
  };
}

export async function activateMemberRegistration(memberId: string) {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, organization_id, location_id, profile_id, membership_number")
    .eq("id", memberId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("registration.activate.get", error);
    return { error: "Unable to activate that registration." };
  }
  if (!data) {
    return { error: "That registration was not found." };
  }

  const member = data as {
    id: string;
    organization_id: string;
    location_id: string;
    profile_id: string | null;
    membership_number: string;
  };

  if (!member.profile_id) {
    return { error: "This member does not have a login account yet." };
  }
  if (!current.isSuperAdmin && !current.staffLocationIds.includes(member.location_id)) {
    return { error: "You can only activate registrations for your campus." };
  }

  const admin = createAdminClient();
  const { error: statusError } = await admin
    .from("profiles")
    .update({ status: "ACTIVE" } as never)
    .eq("id", member.profile_id)
    .eq("organization_id", member.organization_id);

  if (statusError) {
    logServerError("registration.activate.status", statusError);
    return { error: "Unable to activate that account." };
  }

  const { data: memberRole, error: roleLookupError } = await admin
    .from("roles")
    .select("id")
    .eq("name", "MEMBER")
    .maybeSingle();

  if (roleLookupError || !memberRole) {
    logServerError("registration.activate.role", roleLookupError);
    return { error: "Unable to assign the member role." };
  }

  const roleId = (memberRole as { id: string }).id;
  const { data: existingRole, error: existingRoleError } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", member.profile_id)
    .eq("role_id", roleId)
    .eq("organization_id", member.organization_id)
    .eq("location_id", member.location_id)
    .maybeSingle();

  if (existingRoleError) {
    logServerError("registration.activate.roleExisting", existingRoleError);
    return { error: "Unable to assign the member role." };
  }

  if (!existingRole) {
    const { error: roleError } = await admin.from("user_roles").insert({
      user_id: member.profile_id,
      role_id: roleId,
      organization_id: member.organization_id,
      location_id: member.location_id,
    } as never);

    if (roleError) {
      logServerError("registration.activate.roleInsert", roleError);
      return { error: "Unable to assign the member role." };
    }
  }

  const { error: memberError } = await admin
    .from("members")
    .update({ membership_status: "ACTIVE_MEMBER" } as never)
    .eq("id", member.id);

  if (memberError) {
    logServerError("registration.activate.member", memberError);
    return { error: "The login was activated, but the membership status could not be updated." };
  }

  await writeAuditLog({
    action: "MEMBER_REGISTRATION_ACTIVATED",
    entityType: "member",
    entityId: member.id,
    metadata: { profile_id: member.profile_id, membership_number: member.membership_number },
  });

  return { ok: true as const };
}
