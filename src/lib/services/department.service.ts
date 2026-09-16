import { listPageCount, listRange, parseListPage, searchPattern } from "@/lib/admin/list-page";
import type { SortDir } from "@/lib/admin/sort";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import type { CurrentUser } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { displayMemberName } from "@/lib/utils/format";
import { logServerError } from "@/lib/utils/log-server-error";
import {
  DEPARTMENT_STATUSES,
  departmentMemberSchema,
  departmentSchema,
} from "@/lib/validators/department.schema";
import type { DepartmentMemberRole, DepartmentStatus } from "@/types";

export const DEPARTMENT_ROLES = ["SUPER_ADMIN", "LOCATION_ADMIN"] as const;

export const DEPARTMENT_PAGE_SIZE = 20;

export const DEPARTMENT_SORTS = ["name", "location", "status"] as const;

export type DepartmentSort = (typeof DEPARTMENT_SORTS)[number];

type MemberNameRow = {
  first_name: string | null;
  last_name: string | null;
  membership_number: string;
};

export type DepartmentListItem = {
  id: string;
  name: string;
  code: string | null;
  venue: string | null;
  status: DepartmentStatus;
  location_id: string;
  location_name: string;
  location_code: string;
  leader_name: string | null;
  member_count: number;
};

export type DepartmentDetail = DepartmentListItem & {
  organization_id: string;
  description: string | null;
  leader_member_id: string | null;
};

export type DepartmentRosterRow = {
  id: string;
  member_id: string;
  member_name: string;
  membership_number: string;
  role: DepartmentMemberRole;
  joined_at: string;
};

export type DepartmentMemberOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  membership_number: string;
};

export type MemberDepartmentSummary = {
  id: string;
  membership_id: string;
  name: string;
  role: DepartmentMemberRole;
};

export type PortalDepartment = {
  id: string;
  name: string;
  venue: string | null;
  leader_name: string | null;
  role: DepartmentMemberRole;
};

const DEPARTMENT_SELECT =
  "id, organization_id, location_id, name, code, description, venue, leader_member_id, status, locations(name, code), members!departments_leader_member_id_fkey(first_name, last_name, membership_number), department_members(id, left_at)";

function staffCampusId(current: CurrentUser) {
  return current.staffLocationIds[0] ?? current.primaryLocationId ?? null;
}

async function resolveListLocation(current: CurrentUser, requested?: string) {
  if (!current.isSuperAdmin) {
    return staffCampusId(current);
  }

  if (requested !== undefined) {
    return requested || null;
  }

  const selection = await getAdminLocationSelection(current);
  return selection.locationId;
}

function resolveCampus(current: CurrentUser, requested?: string) {
  if (!current.isSuperAdmin) {
    const campus = staffCampusId(current);
    if (!campus) {
      return { error: "Your account is not assigned to a campus." };
    }
    return { locationId: campus };
  }

  const locationId = requested?.trim() || "";
  if (!locationId) {
    return { error: "Select a campus." };
  }
  if (!current.accessibleLocations.some((location) => location.id === locationId)) {
    return { error: "You do not have access to that location." };
  }
  return { locationId };
}

function mapLocation(row: Record<string, unknown>) {
  const location = row.locations as
    | { name: string; code: string }
    | { name: string; code: string }[]
    | null;
  const locationRow = Array.isArray(location) ? location[0] : location;
  return {
    location_id: String(row.location_id),
    location_name: locationRow?.name ?? "—",
    location_code: locationRow?.code ?? "—",
  };
}

function mapLeaderName(row: Record<string, unknown>) {
  const leader = row.members as MemberNameRow | MemberNameRow[] | null;
  const leaderRow = Array.isArray(leader) ? leader[0] : leader;
  if (!leaderRow) {
    return null;
  }
  return displayMemberName(leaderRow);
}

function memberCount(row: Record<string, unknown>) {
  const memberships = row.department_members as Array<{ id: string; left_at: string | null }> | null;
  return (memberships ?? []).filter((item) => !item.left_at).length;
}

function mapDepartment(row: Record<string, unknown>): DepartmentListItem {
  return {
    id: String(row.id),
    name: String(row.name),
    code: (row.code as string | null) ?? null,
    venue: (row.venue as string | null) ?? null,
    status: row.status as DepartmentStatus,
    leader_name: mapLeaderName(row),
    member_count: memberCount(row),
    ...mapLocation(row),
  };
}

function normalizeCode(value?: string) {
  const trimmed = emptyToNull(value);
  return trimmed ? trimmed.toUpperCase() : null;
}

export function canMutateDepartment(current: CurrentUser, locationId: string) {
  if (current.isSuperAdmin) {
    return true;
  }
  return current.staffLocationIds.includes(locationId);
}

export async function listDepartments(
  query: {
    q?: string;
    locationId?: string;
    status?: DepartmentStatus | "all" | "";
    page?: number;
    sort?: DepartmentSort;
    dir?: SortDir;
  } = {},
) {
  const current = await requireRole(DEPARTMENT_ROLES);
  const locationId = await resolveListLocation(current, query.locationId);
  const page = parseListPage(String(query.page ?? 1));
  const { from, to } = listRange(page, DEPARTMENT_PAGE_SIZE);
  const sort = query.sort ?? "name";
  const ascending = (query.dir ?? "asc") === "asc";
  const options = { ascending, nullsFirst: false as const };
  const supabase = await createClient();
  const status =
    query.status && DEPARTMENT_STATUSES.includes(query.status as DepartmentStatus)
      ? (query.status as DepartmentStatus)
      : query.status === "all"
        ? null
        : "ACTIVE";

  let request = supabase
    .from("departments")
    .select(DEPARTMENT_SELECT, { count: "exact" })
    .eq("organization_id", current.organizationId);

  if (locationId) {
    request = request.eq("location_id", locationId);
  }
  if (status) {
    request = request.eq("status", status);
  }

  const pattern = searchPattern(query.q);
  if (pattern) {
    request = request.or(`name.ilike.${pattern},code.ilike.${pattern},venue.ilike.${pattern}`);
  }

  if (sort === "location") {
    request = request.order("locations(name)" as never, options as never);
  } else if (sort === "status") {
    request = request.order("status", options).order("name", options);
  } else {
    request = request.order("name", options);
  }

  const { data, error, count } = await request.range(from, to);
  if (error) {
    logServerError("department.list", error);
    return {
      departments: [] as DepartmentListItem[],
      locationId,
      error: "Unable to load departments.",
      page,
      total: 0,
      pageCount: 1,
      pageSize: DEPARTMENT_PAGE_SIZE,
    };
  }

  const total = count ?? 0;
  return {
    departments: ((data ?? []) as Array<Record<string, unknown>>).map(mapDepartment),
    locationId,
    page,
    total,
    pageCount: listPageCount(total, DEPARTMENT_PAGE_SIZE),
    pageSize: DEPARTMENT_PAGE_SIZE,
  };
}

export async function getDepartment(departmentId: string) {
  const current = await requireRole(DEPARTMENT_ROLES);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select(DEPARTMENT_SELECT)
    .eq("id", departmentId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("department.get", error);
    return { department: null as DepartmentDetail | null, error: "Unable to load that department." };
  }
  if (!data) {
    return { department: null as DepartmentDetail | null };
  }

  const row = data as Record<string, unknown>;
  return {
    department: {
      ...mapDepartment(row),
      organization_id: String(row.organization_id),
      description: (row.description as string | null) ?? null,
      leader_member_id: (row.leader_member_id as string | null) ?? null,
    } satisfies DepartmentDetail,
  };
}

async function loadMember(memberId: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, location_id, first_name, last_name, membership_number, organization_id")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    logServerError("department.member", error);
    return { member: null as (MemberNameRow & { id: string; location_id: string }) | null };
  }

  return {
    member: data as (MemberNameRow & { id: string; location_id: string; organization_id: string }) | null,
  };
}

async function findMembershipInDepartment(departmentId: string, memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("department_members")
    .select("id, left_at")
    .eq("department_id", departmentId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) {
    logServerError("department.membershipGet", error);
    return { membership: null as { id: string; left_at: string | null } | null, error: "Unable to check department membership." };
  }

  return { membership: (data as { id: string; left_at: string | null } | null) ?? null };
}

async function leaveMembership(
  membershipId: string,
  department: { id: string; name: string; leader_member_id: string | null },
  memberId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("department_members")
    .update({ left_at: new Date().toISOString().slice(0, 10), role: "MEMBER" } as never)
    .eq("id", membershipId);

  if (error) {
    return { error: userSafeDatabaseError(error.message) };
  }

  if (department.leader_member_id === memberId) {
    await supabase
      .from("departments")
      .update({ leader_member_id: null } as never)
      .eq("id", department.id);
  }

  await writeAuditLog({
    action: "DEPARTMENT_MEMBER_LEFT",
    entityType: "department_member",
    entityId: membershipId,
    metadata: { department_id: department.id, member_id: memberId },
  });

  return { ok: true as const };
}

async function upsertMembership(departmentId: string, memberId: string, role: DepartmentMemberRole) {
  const existing = await findMembershipInDepartment(departmentId, memberId);
  if (existing.error) {
    return { error: existing.error };
  }

  const supabase = await createClient();
  const row = existing.membership;
  if (row) {
    const update: { left_at: null; role: DepartmentMemberRole; joined_at?: string } = { left_at: null, role };
    if (row.left_at) {
      update.joined_at = new Date().toISOString().slice(0, 10);
    }
    const { error } = await supabase.from("department_members").update(update as never).eq("id", row.id);
    if (error) {
      return { error: userSafeDatabaseError(error.message) };
    }
    return { id: row.id };
  }

  const { data, error } = await supabase
    .from("department_members")
    .insert({
      department_id: departmentId,
      member_id: memberId,
      role,
    } as never)
    .select("id")
    .single();

  if (error) {
    return { error: userSafeDatabaseError(error.message) };
  }

  return { id: (data as { id: string }).id };
}

async function syncLeader(departmentId: string, leaderMemberId: string | null, current: CurrentUser) {
  const supabase = await createClient();
  const existing = await getDepartment(departmentId);
  if (!existing.department) {
    return { error: existing.error ?? "That department is not available." };
  }

  if (leaderMemberId) {
    const loaded = await loadMember(leaderMemberId, current.organizationId);
    if (!loaded.member) {
      return { error: "Select a member from this church." };
    }
    if (loaded.member.location_id !== existing.department.location_id) {
      return { error: "The leader must belong to this campus." };
    }

    const upserted = await upsertMembership(departmentId, leaderMemberId, "LEADER");
    if (upserted.error) {
      return { error: upserted.error };
    }
  }

  const { data: roster, error: rosterError } = await supabase
    .from("department_members")
    .select("id, member_id, role")
    .eq("department_id", departmentId)
    .is("left_at", null);

  if (rosterError) {
    logServerError("department.syncLeader", rosterError);
    return { error: "Unable to update the department leader." };
  }

  for (const row of (roster ?? []) as Array<{ id: string; member_id: string; role: string }>) {
    const nextRole = leaderMemberId && row.member_id === leaderMemberId ? "LEADER" : "MEMBER";
    if (row.role !== nextRole) {
      await supabase.from("department_members").update({ role: nextRole } as never).eq("id", row.id);
    }
  }

  const { error } = await supabase
    .from("departments")
    .update({ leader_member_id: leaderMemberId } as never)
    .eq("id", departmentId)
    .eq("organization_id", current.organizationId);

  if (error) {
    return { error: userSafeDatabaseError(error.message) };
  }

  return { ok: true as const };
}

export async function createDepartment(input: unknown) {
  const current = await requireRole(DEPARTMENT_ROLES);
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const campus = resolveCampus(current, parsed.data.location_id);
  if ("error" in campus) {
    return { error: campus.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .insert({
      organization_id: current.organizationId,
      location_id: campus.locationId,
      name: parsed.data.name,
      code: normalizeCode(parsed.data.code),
      description: emptyToNull(parsed.data.description),
      venue: emptyToNull(parsed.data.venue),
      status: parsed.data.status,
      created_by: current.id,
    } as never)
    .select("id")
    .single();

  if (error) {
    logServerError("department.create", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const created = data as { id: string };
  if (parsed.data.leader_member_id) {
    const leader = await syncLeader(created.id, parsed.data.leader_member_id, current);
    if (leader.error) {
      return { error: leader.error, id: created.id };
    }
  }

  await writeAuditLog({
    action: "DEPARTMENT_CREATED",
    entityType: "department",
    entityId: created.id,
    metadata: { name: parsed.data.name, location_id: campus.locationId },
  });

  return { id: created.id };
}

export async function updateDepartment(departmentId: string, input: unknown) {
  const current = await requireRole(DEPARTMENT_ROLES);
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getDepartment(departmentId);
  if (!existing.department) {
    return { error: "That department is not available." };
  }
  if (!canMutateDepartment(current, existing.department.location_id)) {
    return { error: "You can only change departments for your campus." };
  }

  const campus = resolveCampus(
    current,
    current.isSuperAdmin ? parsed.data.location_id : existing.department.location_id,
  );
  if ("error" in campus) {
    return { error: campus.error };
  }
  if (!current.isSuperAdmin && campus.locationId !== existing.department.location_id) {
    return { error: "You can only change departments for your campus." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({
      location_id: campus.locationId,
      name: parsed.data.name,
      code: normalizeCode(parsed.data.code),
      description: emptyToNull(parsed.data.description),
      venue: emptyToNull(parsed.data.venue),
      status: parsed.data.status,
    } as never)
    .eq("id", departmentId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("department.update", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const leaderId = parsed.data.leader_member_id || null;
  const leader = await syncLeader(departmentId, leaderId, current);
  if (leader.error) {
    return { error: leader.error };
  }

  await writeAuditLog({
    action: "DEPARTMENT_UPDATED",
    entityType: "department",
    entityId: departmentId,
    metadata: { name: parsed.data.name, location_id: campus.locationId },
  });

  return { ok: true as const };
}

export async function deleteDepartment(departmentId: string) {
  const current = await requireRole(DEPARTMENT_ROLES);
  const existing = await getDepartment(departmentId);
  if (!existing.department) {
    return { error: "That department is not available." };
  }
  if (!canMutateDepartment(current, existing.department.location_id)) {
    return { error: "You can only delete departments for your campus." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", departmentId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("department.delete", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "DEPARTMENT_DELETED",
    entityType: "department",
    entityId: departmentId,
    metadata: { name: existing.department.name },
  });

  return { ok: true as const };
}

export async function listDepartmentMembers(departmentId: string) {
  const existing = await getDepartment(departmentId);
  if (!existing.department) {
    return {
      rows: [] as DepartmentRosterRow[],
      error: existing.error ?? "That department is not available.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("department_members")
    .select("id, member_id, role, joined_at, members(first_name, last_name, membership_number)")
    .eq("department_id", departmentId)
    .is("left_at", null)
    .order("role", { ascending: true })
    .order("joined_at", { ascending: true });

  if (error) {
    logServerError("department.roster", error);
    return { rows: [] as DepartmentRosterRow[], error: "Unable to load the roster." };
  }

  return {
    rows: ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const member = row.members as MemberNameRow | MemberNameRow[] | null;
      const memberRow = Array.isArray(member) ? member[0] : member;
      return {
        id: String(row.id),
        member_id: String(row.member_id),
        member_name: memberRow ? displayMemberName(memberRow) : "Unnamed member",
        membership_number: memberRow?.membership_number ?? "—",
        role: row.role as DepartmentMemberRole,
        joined_at: String(row.joined_at),
      };
    }),
  };
}

export async function searchMembersForDepartment(departmentId: string, query: string) {
  const existing = await getDepartment(departmentId);
  if (!existing.department) {
    return { members: [] as DepartmentMemberOption[] };
  }

  const current = await requireRole(DEPARTMENT_ROLES);
  const roster = await listDepartmentMembers(departmentId);
  const excluded = new Set(roster.rows.map((row) => row.member_id));
  const supabase = await createClient();
  let request = supabase
    .from("members")
    .select("id, first_name, last_name, membership_number")
    .eq("organization_id", current.organizationId)
    .eq("location_id", existing.department.location_id)
    .order("last_name")
    .limit(20);

  const search = query.trim();
  if (search) {
    const pattern = `%${search.replace(/,/g, "")}%`;
    request = request.or(
      `membership_number.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
    );
  }

  const { data, error } = await request;
  if (error) {
    logServerError("department.searchMembers", error);
    return { members: [] as DepartmentMemberOption[] };
  }

  return {
    members: ((data ?? []) as DepartmentMemberOption[]).filter((member) => !excluded.has(member.id)),
  };
}

export async function searchLeadersForDepartment(locationId: string, query: string) {
  const current = await requireRole(DEPARTMENT_ROLES);
  const campus = resolveCampus(current, locationId);
  if ("error" in campus) {
    return { members: [] as DepartmentMemberOption[] };
  }

  const supabase = await createClient();
  let request = supabase
    .from("members")
    .select("id, first_name, last_name, membership_number")
    .eq("organization_id", current.organizationId)
    .eq("location_id", campus.locationId)
    .order("last_name")
    .limit(20);

  const search = query.trim();
  if (search) {
    const pattern = `%${search.replace(/,/g, "")}%`;
    request = request.or(
      `membership_number.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
    );
  }

  const { data, error } = await request;
  if (error) {
    logServerError("department.searchLeaders", error);
    return { members: [] as DepartmentMemberOption[] };
  }

  return { members: (data ?? []) as DepartmentMemberOption[] };
}

export async function addDepartmentMember(input: unknown) {
  const current = await requireRole(DEPARTMENT_ROLES);
  const parsed = departmentMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getDepartment(parsed.data.department_id);
  if (!existing.department) {
    return { error: "That department is not available." };
  }
  if (!canMutateDepartment(current, existing.department.location_id)) {
    return { error: "You can only assign members for your campus." };
  }

  const loaded = await loadMember(parsed.data.member_id, current.organizationId);
  if (!loaded.member) {
    return { error: "Select a member from this church." };
  }
  if (loaded.member.location_id !== existing.department.location_id) {
    return { error: "That member belongs to a different campus." };
  }

  const currentMembership = await findMembershipInDepartment(
    parsed.data.department_id,
    parsed.data.member_id,
  );
  if (currentMembership.error) {
    return { error: currentMembership.error };
  }
  if (currentMembership.membership && !currentMembership.membership.left_at) {
    return { error: "That member is already in this department." };
  }

  const upserted = await upsertMembership(parsed.data.department_id, parsed.data.member_id, "MEMBER");
  if (upserted.error || !upserted.id) {
    return { error: upserted.error ?? "Unable to add that member." };
  }

  await writeAuditLog({
    action: "DEPARTMENT_MEMBER_ADDED",
    entityType: "department_member",
    entityId: upserted.id,
    metadata: {
      department_id: parsed.data.department_id,
      member_id: parsed.data.member_id,
    },
  });

  return { ok: true as const };
}

export async function removeDepartmentMember(departmentId: string, membershipId: string) {
  const current = await requireRole(DEPARTMENT_ROLES);
  const existing = await getDepartment(departmentId);
  if (!existing.department) {
    return { error: "That department is not available." };
  }
  if (!canMutateDepartment(current, existing.department.location_id)) {
    return { error: "You can only change the roster for your campus." };
  }

  const supabase = await createClient();
  const { data, error: loadError } = await supabase
    .from("department_members")
    .select("id, member_id, department_id")
    .eq("id", membershipId)
    .eq("department_id", departmentId)
    .is("left_at", null)
    .maybeSingle();

  if (loadError) {
    logServerError("department.removeMember", loadError);
    return { error: "Unable to remove that member." };
  }
  const row = data as { id: string; member_id: string; department_id: string } | null;
  if (!row) {
    return { error: "That member is not in this department." };
  }

  const left = await leaveMembership(
    row.id,
    {
      id: departmentId,
      name: existing.department.name,
      leader_member_id: existing.department.leader_member_id,
    },
    row.member_id,
  );
  if (left.error) {
    return { error: left.error };
  }

  return { ok: true as const, memberId: row.member_id };
}

export async function getMemberDepartments(memberId: string) {
  await requireRole(DEPARTMENT_ROLES);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("department_members")
    .select("id, role, departments(id, name)")
    .eq("member_id", memberId)
    .is("left_at", null)
    .order("joined_at", { ascending: true });

  if (error) {
    logServerError("department.memberList", error);
    return { departments: [] as MemberDepartmentSummary[] };
  }

  return {
    departments: ((data ?? []) as Array<Record<string, unknown>>).flatMap((row) => {
      const department = row.departments as { id: string; name: string } | { id: string; name: string }[] | null;
      const departmentRow = Array.isArray(department) ? department[0] : department;
      if (!departmentRow) {
        return [];
      }
      return [
        {
          id: departmentRow.id,
          membership_id: String(row.id),
          name: departmentRow.name,
          role: row.role as DepartmentMemberRole,
        },
      ];
    }),
  };
}

export type AssignableDepartmentOption = {
  id: string;
  name: string;
  code: string | null;
};

export async function listAssignableDepartments(locationId: string) {
  const current = await requireRole(DEPARTMENT_ROLES);
  if (!canMutateDepartment(current, locationId)) {
    return { departments: [] as AssignableDepartmentOption[] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, code")
    .eq("organization_id", current.organizationId)
    .eq("location_id", locationId)
    .eq("status", "ACTIVE")
    .order("name")
    .limit(100);

  if (error) {
    logServerError("department.assignable", error);
    return { departments: [] as AssignableDepartmentOption[], error: "Unable to load departments." };
  }

  return { departments: (data ?? []) as AssignableDepartmentOption[] };
}

export async function getMyDepartments() {
  const current = await requireRole("MEMBER");
  const supabase = await createClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id")
    .eq("profile_id", current.id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (memberError) {
    logServerError("department.mineMember", memberError);
    return { departments: [] as PortalDepartment[] };
  }
  const memberRow = member as { id: string } | null;
  if (!memberRow) {
    return { departments: [] as PortalDepartment[] };
  }

  const { data, error } = await supabase
    .from("department_members")
    .select("role, departments(id, name, venue)")
    .eq("member_id", memberRow.id)
    .is("left_at", null)
    .order("joined_at", { ascending: true });

  if (error) {
    logServerError("department.mine", error);
    return { departments: [] as PortalDepartment[] };
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const departments: PortalDepartment[] = [];
  for (const row of rows) {
    const department = row.departments as Record<string, unknown> | Record<string, unknown>[] | null;
    const departmentRow = Array.isArray(department) ? department[0] : department;
    if (!departmentRow) {
      continue;
    }

    const { data: leaderLabel } = await supabase.rpc("department_leader_label", {
      p_department_id: String(departmentRow.id),
    } as never);

    departments.push({
      id: String(departmentRow.id),
      name: String(departmentRow.name),
      venue: (departmentRow.venue as string | null) ?? null,
      leader_name: typeof leaderLabel === "string" ? leaderLabel : null,
      role: row.role as DepartmentMemberRole,
    });
  }

  return { departments };
}
