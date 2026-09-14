import { requireRole } from "@/lib/auth/require-role";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import { organizationSchema } from "@/lib/validators/organization.schema";

export type OrganizationSettings = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
};

export async function getOrganization() {
  const current = await requireRole("SUPER_ADMIN");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, email, phone")
    .eq("id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("organization.get", error);
    return { organization: null as OrganizationSettings | null, error: "Unable to load organization settings." };
  }

  return { organization: (data as OrganizationSettings | null) ?? null };
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
