import { requireRole } from "@/lib/auth/require-role";
import { writeAuditLog } from "@/lib/services/audit.service";
import {
  isOrganizationLogoFile,
  ORGANIZATION_LOGO_BUCKET,
  ORGANIZATION_LOGO_MAX_BYTES,
  organizationLogoExtension,
  organizationLogoPath,
  resolveOrganizationLogoUrl,
} from "@/lib/storage/organization-logo";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import { organizationSchema } from "@/lib/validators/organization.schema";

export type OrganizationSettings = {
  id: string;
  name: string;
  slug: string;
  short_code: string;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  logo_src: string | null;
};

export async function getOrganization() {
  const current = await requireRole("SUPER_ADMIN");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, short_code, email, phone, logo_url")
    .eq("id", current.organizationId)
    .maybeSingle();

  let organization = data as Omit<OrganizationSettings, "logo_src"> | null;
  if (error?.message.toLowerCase().includes("short_code")) {
    const fallback = await supabase
      .from("organizations")
      .select("id, name, slug, email, phone, logo_url")
      .eq("id", current.organizationId)
      .maybeSingle();
    if (fallback.error) {
      logServerError("organization.get", fallback.error);
      return { organization: null as OrganizationSettings | null, error: "Unable to load organization settings." };
    }
    const row = fallback.data as Omit<OrganizationSettings, "short_code" | "logo_src"> | null;
    organization = row
      ? { ...row, short_code: row.slug.includes("heartfelt") ? "HIM" : "ORG" }
      : null;
  } else if (error) {
    logServerError("organization.get", error);
    return { organization: null as OrganizationSettings | null, error: "Unable to load organization settings." };
  }

  if (!organization) {
    return { organization: null as OrganizationSettings | null };
  }

  return {
    organization: {
      ...organization,
      logo_src: await resolveOrganizationLogoUrl(organization.logo_url),
    },
  };
}

export async function updateOrganization(input: unknown) {
  const current = await requireRole("SUPER_ADMIN");
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      email: emptyToNull(parsed.data.email),
      phone: emptyToNull(parsed.data.phone),
    } as never)
    .eq("id", current.organizationId);

  if (error) {
    logServerError("organization.update", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "ORGANIZATION_UPDATED",
    entityType: "organization",
    entityId: current.organizationId,
    metadata: { name: parsed.data.name },
  });

  return { ok: true as const };
}

async function setOrganizationLogoUrl(organizationId: string, logoUrl: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: logoUrl } as never)
    .eq("id", organizationId);

  if (error) {
    logServerError("organization.logoUpdate", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  return { ok: true as const };
}

async function removeStoredLogos(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(ORGANIZATION_LOGO_BUCKET).list(organizationId);
  if (error) {
    logServerError("organization.logoList", error);
    return { error: "Unable to update the logo." };
  }

  const stale = (data ?? [])
    .filter((file) => file.name.startsWith("logo."))
    .map((file) => `${organizationId}/${file.name}`);
  if (stale.length === 0) {
    return { ok: true as const };
  }

  const removed = await supabase.storage.from(ORGANIZATION_LOGO_BUCKET).remove(stale);
  if (removed.error) {
    logServerError("organization.logoRemove", removed.error);
    return { error: "Unable to update the logo." };
  }

  return { ok: true as const };
}

export async function uploadOrganizationLogo(input: FormDataEntryValue | File | null) {
  const current = await requireRole("SUPER_ADMIN");
  if (!isOrganizationLogoFile(input) || input.size === 0) {
    return { error: "Choose a logo image." };
  }
  if (input.size > ORGANIZATION_LOGO_MAX_BYTES) {
    return { error: "Use an image smaller than 5 MB." };
  }

  const extension = organizationLogoExtension(input.type, input.name);
  if (!extension) {
    return { error: "Use a PNG, JPG, WEBP, or SVG image." };
  }

  const cleared = await removeStoredLogos(current.organizationId);
  if (cleared.error) {
    return { error: cleared.error };
  }

  const path = organizationLogoPath(current.organizationId, extension);
  const supabase = await createClient();
  const uploaded = await supabase.storage.from(ORGANIZATION_LOGO_BUCKET).upload(path, await input.arrayBuffer(), {
    contentType: input.type || `image/${extension === "jpg" ? "jpeg" : extension}`,
    upsert: true,
  });
  if (uploaded.error) {
    logServerError("organization.logoUpload", uploaded.error);
    return { error: "Unable to upload that logo." };
  }

  const saved = await setOrganizationLogoUrl(current.organizationId, path);
  if (saved.error) {
    return { error: saved.error };
  }

  await writeAuditLog({
    action: "ORGANIZATION_LOGO_UPDATED",
    entityType: "organization",
    entityId: current.organizationId,
    metadata: { path },
  });

  return { ok: true as const };
}

export async function removeOrganizationLogo() {
  const current = await requireRole("SUPER_ADMIN");
  const cleared = await removeStoredLogos(current.organizationId);
  if (cleared.error) {
    return { error: cleared.error };
  }

  const saved = await setOrganizationLogoUrl(current.organizationId, null);
  if (saved.error) {
    return { error: saved.error };
  }

  await writeAuditLog({
    action: "ORGANIZATION_LOGO_REMOVED",
    entityType: "organization",
    entityId: current.organizationId,
  });

  return { ok: true as const };
}
