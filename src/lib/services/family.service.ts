import { requireRole } from "@/lib/auth/require-role";
import { writeAuditLog } from "@/lib/services/audit.service";
import { getMember } from "@/lib/services/member.service";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError as logError } from "@/lib/utils/log-server-error";
import { familyLinkSchema } from "@/lib/validators/family.schema";

export type FamilyMemberOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  membership_number: string;
  location_name: string;
  location_code: string;
};

export type FamilyLinkRow = {
  id: string;
  related_member_id: string;
  name: string;
  membership_number: string;
  location_name: string;
  relationship: string;
  notes: string | null;
};

async function loadFamilyLinks(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_family_links_for_member", {
    p_member_id: memberId,
  } as never);

  if (error) {
    logError("family.list", error);
    return { links: [] as FamilyLinkRow[], error: "Unable to load family connections." };
  }

  return {
    links: ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const name = [row.related_first_name, row.related_last_name].filter(Boolean).join(" ").trim();
      return {
        id: String(row.id),
        related_member_id: String(row.related_member_id),
        name: name || String(row.related_membership_number),
        membership_number: String(row.related_membership_number),
        location_name:
          row.location_name && row.location_code
            ? `${row.location_name} (${row.location_code})`
            : "—",
        relationship: String(row.relationship),
        notes: (row.notes as string | null) ?? null,
      };
    }),
  };
}

export async function listMemberFamily(memberId: string) {
  const existing = await getMember(memberId);
  if (!existing.member) {
    return { links: [] as FamilyLinkRow[], error: existing.error ?? "Member not found." };
  }

  return loadFamilyLinks(existing.member.id);
}

export async function listMyFamily() {
  const current = await requireRole("MEMBER");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id")
    .eq("profile_id", current.id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logError("family.mine", error);
    return { links: [] as FamilyLinkRow[] };
  }

  const member = data as { id: string } | null;
  if (!member) {
    return { links: [] as FamilyLinkRow[] };
  }

  return loadFamilyLinks(member.id);
}

export async function searchMembersForFamily(memberId: string, query: string) {
  const existing = await getMember(memberId);
  if (!existing.member) {
    return { members: [] as FamilyMemberOption[] };
  }

  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const linked = await loadFamilyLinks(existing.member.id);
  const excluded = new Set([existing.member.id, ...linked.links.map((link) => link.related_member_id)]);
  const supabase = await createClient();
  let request = supabase
    .from("members")
    .select("id, first_name, last_name, membership_number, locations(name, code)")
    .eq("organization_id", current.organizationId)
    .order("last_name")
    .limit(20);

  if (!current.isSuperAdmin) {
    const locationId = current.staffLocationIds[0] ?? existing.member.location_id;
    request = request.eq("location_id", locationId);
  }

  const search = query.trim();
  if (search) {
    const pattern = `%${search.replace(/,/g, "")}%`;
    request = request.or(
      `membership_number.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
    );
  }

  const { data, error } = await request;
  if (error) {
    logError("family.search", error);
    return { members: [] as FamilyMemberOption[] };
  }

  return {
    members: ((data ?? []) as Array<Record<string, unknown>>)
      .filter((row) => !excluded.has(String(row.id)))
      .map((row) => {
        const location = row.locations as
          | { name: string; code: string }
          | { name: string; code: string }[]
          | null;
        const locationRow = Array.isArray(location) ? location[0] : location;
        return {
          id: String(row.id),
          first_name: (row.first_name as string | null) ?? null,
          last_name: (row.last_name as string | null) ?? null,
          membership_number: String(row.membership_number),
          location_name: locationRow?.name ?? "—",
          location_code: locationRow?.code ?? "",
        };
      }),
  };
}

export async function createFamilyLink(input: unknown) {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const parsed = familyLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const member = await getMember(parsed.data.member_id);
  const related = await getMember(parsed.data.related_member_id);
  if (!member.member) {
    return { error: member.error ?? "That member is not available." };
  }
  if (!related.member) {
    return { error: related.error ?? "That family member is not available." };
  }
  if (member.member.id === related.member.id) {
    return { error: "A member cannot be connected to themselves." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_family_links")
    .insert({
      organization_id: current.organizationId,
      member_id: member.member.id,
      related_member_id: related.member.id,
      relationship: parsed.data.relationship,
      notes: emptyToNull(parsed.data.notes),
      created_by: current.id,
    } as never)
    .select("id")
    .single();

  if (error) {
    logError("family.create", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const created = data as { id: string } | null;
  await writeAuditLog({
    action: "FAMILY_LINK_CREATED",
    entityType: "member_family_link",
    entityId: created?.id,
    metadata: {
      member_id: member.member.id,
      related_member_id: related.member.id,
      relationship: parsed.data.relationship,
    },
  });

  return { id: created?.id };
}

export async function removeFamilyLink(memberId: string, linkId: string) {
  await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const existing = await getMember(memberId);
  if (!existing.member) {
    return { error: existing.error ?? "Member not found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_family_links")
    .delete()
    .eq("id", linkId)
    .eq("organization_id", existing.member.organization_id)
    .or(`member_id.eq.${memberId},related_member_id.eq.${memberId}`)
    .select("id")
    .maybeSingle();

  if (error) {
    logError("family.remove", error);
    return { error: "Unable to remove that family connection." };
  }
  if (!data) {
    return { error: "That family connection was not found." };
  }

  await writeAuditLog({
    action: "FAMILY_LINK_REMOVED",
    entityType: "member_family_link",
    entityId: linkId,
    metadata: { member_id: memberId },
  });

  return { ok: true as const };
}
