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
  CELL_GROUP_ATTENDANCE_STATUSES,
  CELL_GROUP_STATUSES,
  cellGroupAttendanceSchema,
  cellGroupMemberSchema,
  cellGroupSchema,
} from "@/lib/validators/cell-group.schema";
import type { CellGroupAttendanceStatus, CellGroupMemberRole, CellGroupStatus } from "@/types";

export const CELL_GROUP_ROLES = ["SUPER_ADMIN", "LOCATION_ADMIN"] as const;

export const CELL_GROUP_PAGE_SIZE = 20;

export const CELL_GROUP_SORTS = ["name", "location", "meeting", "status"] as const;

export type CellGroupSort = (typeof CELL_GROUP_SORTS)[number];

type MemberNameRow = {
  first_name: string | null;
  last_name: string | null;
  membership_number: string;
};

export type CellGroupListItem = {
  id: string;
  name: string;
  code: string | null;
  venue: string | null;
  meeting_weekday: number | null;
  meeting_time: string | null;
  status: CellGroupStatus;
  location_id: string;
  location_name: string;
  location_code: string;
  leader_name: string | null;
  member_count: number;
};

export type CellGroupDetail = CellGroupListItem & {
  organization_id: string;
  description: string | null;
  leader_member_id: string | null;
};

export type CellGroupRosterRow = {
  id: string;
  member_id: string;
  member_name: string;
  membership_number: string;
  role: CellGroupMemberRole;
  joined_at: string;
};

export type CellGroupMemberOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  membership_number: string;
};

export type CellGroupMeetingRow = {
  id: string;
  meeting_date: string;
  notes: string | null;
  present: number;
  absent: number;
  excused: number;
};

export type CellGroupAttendanceMark = {
  member_id: string;
  member_name: string;
  membership_number: string;
  status: CellGroupAttendanceStatus;
};

export type PortalCellGroup = {
  id: string;
  name: string;
  venue: string | null;
  meeting_weekday: number | null;
  meeting_time: string | null;
  leader_name: string | null;
  role: CellGroupMemberRole;
  attendance: Array<{
    meeting_date: string;
    status: CellGroupAttendanceStatus;
  }>;
};

const GROUP_SELECT =
  "id, organization_id, location_id, name, code, description, venue, meeting_weekday, meeting_time, leader_member_id, status, locations(name, code), members!cell_groups_leader_member_id_fkey(first_name, last_name, membership_number), cell_group_members(id, left_at)";

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
  const memberships = row.cell_group_members as Array<{ id: string; left_at: string | null }> | null;
  return (memberships ?? []).filter((item) => !item.left_at).length;
}

function mapGroup(row: Record<string, unknown>): CellGroupListItem {
  return {
    id: String(row.id),
    name: String(row.name),
    code: (row.code as string | null) ?? null,
    venue: (row.venue as string | null) ?? null,
    meeting_weekday: row.meeting_weekday == null ? null : Number(row.meeting_weekday),
    meeting_time: (row.meeting_time as string | null) ?? null,
    status: row.status as CellGroupStatus,
    leader_name: mapLeaderName(row),
    member_count: memberCount(row),
    ...mapLocation(row),
  };
}

function normalizeCode(value?: string) {
  const trimmed = emptyToNull(value);
  return trimmed ? trimmed.toUpperCase() : null;
}

function normalizeTime(value?: string) {
  const trimmed = emptyToNull(value);
  if (!trimmed) {
    return null;
  }
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

export function canMutateCellGroup(current: CurrentUser, locationId: string) {
  if (current.isSuperAdmin) {
    return true;
  }
  return current.staffLocationIds.includes(locationId);
}

export async function listCellGroups(
  query: {
    q?: string;
    locationId?: string;
    status?: CellGroupStatus | "all" | "";
    page?: number;
    sort?: CellGroupSort;
    dir?: SortDir;
  } = {},
) {
  const current = await requireRole(CELL_GROUP_ROLES);
  const locationId = await resolveListLocation(current, query.locationId);
  const page = parseListPage(String(query.page ?? 1));
  const { from, to } = listRange(page, CELL_GROUP_PAGE_SIZE);
  const sort = query.sort ?? "name";
  const ascending = (query.dir ?? "asc") === "asc";
  const options = { ascending, nullsFirst: false as const };
  const supabase = await createClient();
  const status =
    query.status && CELL_GROUP_STATUSES.includes(query.status as CellGroupStatus)
      ? (query.status as CellGroupStatus)
      : query.status === "all"
        ? null
        : "ACTIVE";

  let request = supabase
    .from("cell_groups")
    .select(GROUP_SELECT, { count: "exact" })
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
  } else if (sort === "meeting") {
    request = request.order("meeting_weekday", options).order("meeting_time", options);
  } else if (sort === "status") {
    request = request.order("status", options).order("name", options);
  } else {
    request = request.order("name", options);
  }

  const { data, error, count } = await request.range(from, to);
  if (error) {
    logServerError("cellGroup.list", error);
    return {
      groups: [] as CellGroupListItem[],
      locationId,
      error: "Unable to load cell groups.",
      page,
      total: 0,
      pageCount: 1,
      pageSize: CELL_GROUP_PAGE_SIZE,
    };
  }

  const total = count ?? 0;
  return {
    groups: ((data ?? []) as Array<Record<string, unknown>>).map(mapGroup),
    locationId,
    page,
    total,
    pageCount: listPageCount(total, CELL_GROUP_PAGE_SIZE),
    pageSize: CELL_GROUP_PAGE_SIZE,
  };
}

export async function getCellGroup(groupId: string) {
  const current = await requireRole(CELL_GROUP_ROLES);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cell_groups")
    .select(GROUP_SELECT)
    .eq("id", groupId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("cellGroup.get", error);
    return { group: null as CellGroupDetail | null, error: "Unable to load that cell group." };
  }
  if (!data) {
    return { group: null as CellGroupDetail | null };
  }

  const row = data as Record<string, unknown>;
  return {
    group: {
      ...mapGroup(row),
      organization_id: String(row.organization_id),
      description: (row.description as string | null) ?? null,
      leader_member_id: (row.leader_member_id as string | null) ?? null,
    } satisfies CellGroupDetail,
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
    logServerError("cellGroup.member", error);
    return { member: null as (MemberNameRow & { id: string; location_id: string }) | null };
  }

  return {
    member: data as (MemberNameRow & { id: string; location_id: string; organization_id: string }) | null,
  };
}

async function findActiveMembership(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cell_group_members")
    .select("id, cell_group_id, role, cell_groups(id, name, leader_member_id)")
    .eq("member_id", memberId)
    .is("left_at", null)
    .maybeSingle();

  if (error) {
    logServerError("cellGroup.activeMembership", error);
    return { membership: null as Record<string, unknown> | null, error: "Unable to check group membership." };
  }

  return { membership: (data as Record<string, unknown> | null) ?? null };
}

async function leaveMembership(membership: Record<string, unknown>, memberId: string) {
  const supabase = await createClient();
  const group = membership.cell_groups as
    | { id: string; name: string; leader_member_id: string | null }
    | { id: string; name: string; leader_member_id: string | null }[]
    | null;
  const groupRow = Array.isArray(group) ? group[0] : group;
  const { error } = await supabase
    .from("cell_group_members")
    .update({ left_at: new Date().toISOString().slice(0, 10), role: "MEMBER" } as never)
    .eq("id", String(membership.id));

  if (error) {
    return { error: userSafeDatabaseError(error.message) };
  }

  if (groupRow?.leader_member_id === memberId) {
    await supabase
      .from("cell_groups")
      .update({ leader_member_id: null } as never)
      .eq("id", groupRow.id);
  }

  await writeAuditLog({
    action: "CELL_GROUP_MEMBER_LEFT",
    entityType: "cell_group_member",
    entityId: String(membership.id),
    metadata: { cell_group_id: groupRow?.id, member_id: memberId, previous_group: groupRow?.name },
  });

  return { previousGroupName: groupRow?.name ?? null };
}

async function upsertMembership(groupId: string, memberId: string, role: CellGroupMemberRole) {
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("cell_group_members")
    .select("id, left_at")
    .eq("cell_group_id", groupId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (existingError) {
    logServerError("cellGroup.membershipGet", existingError);
    return { error: "Unable to update group membership." };
  }

  const row = existing as { id: string; left_at: string | null } | null;
  if (row) {
    const update: { left_at: null; role: CellGroupMemberRole; joined_at?: string } = { left_at: null, role };
    if (row.left_at) {
      update.joined_at = new Date().toISOString().slice(0, 10);
    }
    const { error } = await supabase.from("cell_group_members").update(update as never).eq("id", row.id);
    if (error) {
      return { error: userSafeDatabaseError(error.message) };
    }
    return { id: row.id };
  }

  const { data, error } = await supabase
    .from("cell_group_members")
    .insert({
      cell_group_id: groupId,
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

async function syncLeader(groupId: string, leaderMemberId: string | null, current: CurrentUser) {
  const supabase = await createClient();
  const existing = await getCellGroup(groupId);
  if (!existing.group) {
    return { error: existing.error ?? "That cell group is not available." };
  }

  if (leaderMemberId) {
    const loaded = await loadMember(leaderMemberId, current.organizationId);
    if (!loaded.member) {
      return { error: "Select a member from this church." };
    }
    if (loaded.member.location_id !== existing.group.location_id) {
      return { error: "The leader must belong to this campus." };
    }

    const active = await findActiveMembership(leaderMemberId);
    if (active.error) {
      return { error: active.error };
    }
    if (active.membership && String(active.membership.cell_group_id) !== groupId) {
      const left = await leaveMembership(active.membership, leaderMemberId);
      if (left.error) {
        return { error: left.error };
      }
    }

    const upserted = await upsertMembership(groupId, leaderMemberId, "LEADER");
    if (upserted.error) {
      return { error: upserted.error };
    }
  }

  const { data: roster, error: rosterError } = await supabase
    .from("cell_group_members")
    .select("id, member_id, role")
    .eq("cell_group_id", groupId)
    .is("left_at", null);

  if (rosterError) {
    logServerError("cellGroup.syncLeader", rosterError);
    return { error: "Unable to update the group leader." };
  }

  for (const row of (roster ?? []) as Array<{ id: string; member_id: string; role: string }>) {
    const nextRole = leaderMemberId && row.member_id === leaderMemberId ? "LEADER" : "MEMBER";
    if (row.role !== nextRole) {
      await supabase.from("cell_group_members").update({ role: nextRole } as never).eq("id", row.id);
    }
  }

  const { error } = await supabase
    .from("cell_groups")
    .update({ leader_member_id: leaderMemberId } as never)
    .eq("id", groupId)
    .eq("organization_id", current.organizationId);

  if (error) {
    return { error: userSafeDatabaseError(error.message) };
  }

  return { ok: true as const };
}

export async function createCellGroup(input: unknown) {
  const current = await requireRole(CELL_GROUP_ROLES);
  const parsed = cellGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const campus = resolveCampus(current, parsed.data.location_id);
  if ("error" in campus) {
    return { error: campus.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cell_groups")
    .insert({
      organization_id: current.organizationId,
      location_id: campus.locationId,
      name: parsed.data.name,
      code: normalizeCode(parsed.data.code),
      description: emptyToNull(parsed.data.description),
      venue: emptyToNull(parsed.data.venue),
      meeting_weekday: parsed.data.meeting_weekday ? Number(parsed.data.meeting_weekday) : null,
      meeting_time: normalizeTime(parsed.data.meeting_time),
      status: parsed.data.status,
      created_by: current.id,
    } as never)
    .select("id")
    .single();

  if (error) {
    logServerError("cellGroup.create", error);
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
    action: "CELL_GROUP_CREATED",
    entityType: "cell_group",
    entityId: created.id,
    metadata: { name: parsed.data.name, location_id: campus.locationId },
  });

  return { id: created.id };
}

export async function updateCellGroup(groupId: string, input: unknown) {
  const current = await requireRole(CELL_GROUP_ROLES);
  const parsed = cellGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getCellGroup(groupId);
  if (!existing.group) {
    return { error: "That cell group is not available." };
  }
  if (!canMutateCellGroup(current, existing.group.location_id)) {
    return { error: "You can only change cell groups for your campus." };
  }

  const campus = resolveCampus(
    current,
    current.isSuperAdmin ? parsed.data.location_id : existing.group.location_id,
  );
  if ("error" in campus) {
    return { error: campus.error };
  }
  if (!current.isSuperAdmin && campus.locationId !== existing.group.location_id) {
    return { error: "You can only change cell groups for your campus." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cell_groups")
    .update({
      location_id: campus.locationId,
      name: parsed.data.name,
      code: normalizeCode(parsed.data.code),
      description: emptyToNull(parsed.data.description),
      venue: emptyToNull(parsed.data.venue),
      meeting_weekday: parsed.data.meeting_weekday ? Number(parsed.data.meeting_weekday) : null,
      meeting_time: normalizeTime(parsed.data.meeting_time),
      status: parsed.data.status,
    } as never)
    .eq("id", groupId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("cellGroup.update", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const leaderId = parsed.data.leader_member_id || null;
  const leader = await syncLeader(groupId, leaderId, current);
  if (leader.error) {
    return { error: leader.error };
  }

  await writeAuditLog({
    action: "CELL_GROUP_UPDATED",
    entityType: "cell_group",
    entityId: groupId,
    metadata: { name: parsed.data.name, location_id: campus.locationId },
  });

  return { ok: true as const };
}

export async function deleteCellGroup(groupId: string) {
  const current = await requireRole(CELL_GROUP_ROLES);
  const existing = await getCellGroup(groupId);
  if (!existing.group) {
    return { error: "That cell group is not available." };
  }
  if (!canMutateCellGroup(current, existing.group.location_id)) {
    return { error: "You can only delete cell groups for your campus." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cell_groups")
    .delete()
    .eq("id", groupId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("cellGroup.delete", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "CELL_GROUP_DELETED",
    entityType: "cell_group",
    entityId: groupId,
    metadata: { name: existing.group.name },
  });

  return { ok: true as const };
}

export async function listCellGroupMembers(groupId: string) {
  const existing = await getCellGroup(groupId);
  if (!existing.group) {
    return { rows: [] as CellGroupRosterRow[], error: existing.error ?? "That cell group is not available." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cell_group_members")
    .select("id, member_id, role, joined_at, members(first_name, last_name, membership_number)")
    .eq("cell_group_id", groupId)
    .is("left_at", null)
    .order("role", { ascending: true })
    .order("joined_at", { ascending: true });

  if (error) {
    logServerError("cellGroup.roster", error);
    return { rows: [] as CellGroupRosterRow[], error: "Unable to load the roster." };
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
        role: row.role as CellGroupMemberRole,
        joined_at: String(row.joined_at),
      };
    }),
  };
}

export async function searchMembersForCellGroup(groupId: string, query: string) {
  const existing = await getCellGroup(groupId);
  if (!existing.group) {
    return { members: [] as CellGroupMemberOption[] };
  }

  const current = await requireRole(CELL_GROUP_ROLES);
  const roster = await listCellGroupMembers(groupId);
  const excluded = new Set(roster.rows.map((row) => row.member_id));
  const supabase = await createClient();
  let request = supabase
    .from("members")
    .select("id, first_name, last_name, membership_number")
    .eq("organization_id", current.organizationId)
    .eq("location_id", existing.group.location_id)
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
    logServerError("cellGroup.searchMembers", error);
    return { members: [] as CellGroupMemberOption[] };
  }

  return {
    members: ((data ?? []) as CellGroupMemberOption[]).filter((member) => !excluded.has(member.id)),
  };
}

export async function searchLeadersForCellGroup(locationId: string, query: string) {
  const current = await requireRole(CELL_GROUP_ROLES);
  const campus = resolveCampus(current, locationId);
  if ("error" in campus) {
    return { members: [] as CellGroupMemberOption[] };
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
    logServerError("cellGroup.searchLeaders", error);
    return { members: [] as CellGroupMemberOption[] };
  }

  return { members: (data ?? []) as CellGroupMemberOption[] };
}

export async function addCellGroupMember(input: unknown) {
  const current = await requireRole(CELL_GROUP_ROLES);
  const parsed = cellGroupMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getCellGroup(parsed.data.cell_group_id);
  if (!existing.group) {
    return { error: "That cell group is not available." };
  }
  if (!canMutateCellGroup(current, existing.group.location_id)) {
    return { error: "You can only assign members for your campus." };
  }

  const loaded = await loadMember(parsed.data.member_id, current.organizationId);
  if (!loaded.member) {
    return { error: "Select a member from this church." };
  }
  if (loaded.member.location_id !== existing.group.location_id) {
    return { error: "That member belongs to a different campus." };
  }

  const active = await findActiveMembership(parsed.data.member_id);
  if (active.error) {
    return { error: active.error };
  }
  if (active.membership && String(active.membership.cell_group_id) === parsed.data.cell_group_id) {
    return { error: "That member is already in this cell group." };
  }

  let movedFrom: string | null = null;
  if (active.membership) {
    const left = await leaveMembership(active.membership, parsed.data.member_id);
    if (left.error) {
      return { error: left.error };
    }
    movedFrom = left.previousGroupName ?? null;
  }

  const upserted = await upsertMembership(parsed.data.cell_group_id, parsed.data.member_id, "MEMBER");
  if (upserted.error || !upserted.id) {
    return { error: upserted.error ?? "Unable to add that member." };
  }

  await writeAuditLog({
    action: "CELL_GROUP_MEMBER_ADDED",
    entityType: "cell_group_member",
    entityId: upserted.id,
    metadata: {
      cell_group_id: parsed.data.cell_group_id,
      member_id: parsed.data.member_id,
      moved_from: movedFrom,
    },
  });

  return { ok: true as const, movedFrom };
}

export async function removeCellGroupMember(groupId: string, membershipId: string) {
  const current = await requireRole(CELL_GROUP_ROLES);
  const existing = await getCellGroup(groupId);
  if (!existing.group) {
    return { error: "That cell group is not available." };
  }
  if (!canMutateCellGroup(current, existing.group.location_id)) {
    return { error: "You can only change the roster for your campus." };
  }

  const supabase = await createClient();
  const { data, error: loadError } = await supabase
    .from("cell_group_members")
    .select("id, member_id, cell_group_id")
    .eq("id", membershipId)
    .eq("cell_group_id", groupId)
    .is("left_at", null)
    .maybeSingle();

  if (loadError) {
    logServerError("cellGroup.removeMember", loadError);
    return { error: "Unable to remove that member." };
  }
  const row = data as { id: string; member_id: string; cell_group_id: string } | null;
  if (!row) {
    return { error: "That member is not in this group." };
  }

  const left = await leaveMembership(
    { id: row.id, cell_group_id: row.cell_group_id, cell_groups: { id: groupId, name: existing.group.name, leader_member_id: existing.group.leader_member_id } },
    row.member_id,
  );
  if (left.error) {
    return { error: left.error };
  }

  return { ok: true as const };
}

export async function listCellGroupMeetings(groupId: string) {
  const existing = await getCellGroup(groupId);
  if (!existing.group) {
    return { rows: [] as CellGroupMeetingRow[], error: existing.error ?? "That cell group is not available." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cell_group_meetings")
    .select("id, meeting_date, notes, cell_group_attendance(status)")
    .eq("cell_group_id", groupId)
    .order("meeting_date", { ascending: false })
    .limit(24);

  if (error) {
    logServerError("cellGroup.meetings", error);
    return { rows: [] as CellGroupMeetingRow[], error: "Unable to load meeting history." };
  }

  return {
    rows: ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const marks = (row.cell_group_attendance as Array<{ status: string }> | null) ?? [];
      return {
        id: String(row.id),
        meeting_date: String(row.meeting_date),
        notes: (row.notes as string | null) ?? null,
        present: marks.filter((item) => item.status === "PRESENT").length,
        absent: marks.filter((item) => item.status === "ABSENT").length,
        excused: marks.filter((item) => item.status === "EXCUSED").length,
      };
    }),
  };
}

export async function getCellGroupAttendance(groupId: string, meetingDate: string) {
  const roster = await listCellGroupMembers(groupId);
  if (roster.error) {
    return { marks: [] as CellGroupAttendanceMark[], notes: "", error: roster.error };
  }

  const supabase = await createClient();
  const { data: meeting } = await supabase
    .from("cell_group_meetings")
    .select("id, notes, cell_group_attendance(member_id, status)")
    .eq("cell_group_id", groupId)
    .eq("meeting_date", meetingDate)
    .maybeSingle();

  const meetingRow = meeting as
    | {
        id: string;
        notes: string | null;
        cell_group_attendance: Array<{ member_id: string; status: CellGroupAttendanceStatus }> | null;
      }
    | null;
  const previous = new Map(
    (meetingRow?.cell_group_attendance ?? []).map((item) => [item.member_id, item.status]),
  );

  return {
    notes: meetingRow?.notes ?? "",
    marks: roster.rows.map((row) => ({
      member_id: row.member_id,
      member_name: row.member_name,
      membership_number: row.membership_number,
      status: previous.get(row.member_id) ?? ("PRESENT" as const),
    })),
  };
}

export async function recordCellGroupAttendance(input: unknown) {
  const current = await requireRole(CELL_GROUP_ROLES);
  const parsed = cellGroupAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getCellGroup(parsed.data.cell_group_id);
  if (!existing.group) {
    return { error: "That cell group is not available." };
  }
  if (!canMutateCellGroup(current, existing.group.location_id)) {
    return { error: "You can only record attendance for your campus." };
  }

  const roster = await listCellGroupMembers(parsed.data.cell_group_id);
  const allowed = new Set(roster.rows.map((row) => row.member_id));
  const marks = parsed.data.attendance.filter((item) => allowed.has(item.member_id));
  if (marks.length === 0) {
    return { error: "Add members to the group before recording attendance." };
  }
  if (marks.some((item) => !CELL_GROUP_ATTENDANCE_STATUSES.includes(item.status))) {
    return { error: "That attendance status is not valid." };
  }

  const supabase = await createClient();
  const { data: meeting, error: meetingError } = await supabase
    .from("cell_group_meetings")
    .upsert(
      {
        organization_id: current.organizationId,
        cell_group_id: parsed.data.cell_group_id,
        meeting_date: parsed.data.meeting_date,
        notes: emptyToNull(parsed.data.notes),
        created_by: current.id,
      } as never,
      { onConflict: "cell_group_id,meeting_date" },
    )
    .select("id")
    .single();

  if (meetingError || !meeting) {
    logServerError("cellGroup.meetingUpsert", meetingError);
    return { error: userSafeDatabaseError(meetingError?.message ?? "Unable to save the meeting.") };
  }

  const meetingId = (meeting as { id: string }).id;
  const { error: attendanceError } = await supabase.from("cell_group_attendance").upsert(
    marks.map((item) => ({
      meeting_id: meetingId,
      member_id: item.member_id,
      status: item.status,
    })) as never,
    { onConflict: "meeting_id,member_id" },
  );

  if (attendanceError) {
    logServerError("cellGroup.attendance", attendanceError);
    return { error: userSafeDatabaseError(attendanceError.message) };
  }

  await writeAuditLog({
    action: "CELL_GROUP_ATTENDANCE_RECORDED",
    entityType: "cell_group_meeting",
    entityId: meetingId,
    metadata: {
      cell_group_id: parsed.data.cell_group_id,
      meeting_date: parsed.data.meeting_date,
      count: marks.length,
    },
  });

  return { ok: true as const };
}

export async function getMemberCellGroup(memberId: string) {
  await requireRole(CELL_GROUP_ROLES);
  const active = await findActiveMembership(memberId);
  if (!active.membership) {
    return { group: null as { id: string; name: string } | null };
  }

  const group = active.membership.cell_groups as
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
  const groupRow = Array.isArray(group) ? group[0] : group;
  if (!groupRow) {
    return { group: null as { id: string; name: string } | null };
  }

  return { group: { id: groupRow.id, name: groupRow.name } };
}

export async function getMyCellGroup() {
  const current = await requireRole("MEMBER");
  const supabase = await createClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id")
    .eq("profile_id", current.id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (memberError) {
    logServerError("cellGroup.mineMember", memberError);
    return { group: null as PortalCellGroup | null };
  }
  const memberRow = member as { id: string } | null;
  if (!memberRow) {
    return { group: null as PortalCellGroup | null };
  }

  const { data, error } = await supabase
    .from("cell_group_members")
    .select("role, cell_groups(id, name, venue, meeting_weekday, meeting_time)")
    .eq("member_id", memberRow.id)
    .is("left_at", null)
    .maybeSingle();

  if (error) {
    logServerError("cellGroup.mine", error);
    return { group: null as PortalCellGroup | null };
  }
  if (!data) {
    return { group: null as PortalCellGroup | null };
  }

  const row = data as Record<string, unknown>;
  const group = row.cell_groups as Record<string, unknown> | Record<string, unknown>[] | null;
  const groupRow = Array.isArray(group) ? group[0] : group;
  if (!groupRow) {
    return { group: null as PortalCellGroup | null };
  }

  const { data: leaderLabel } = await supabase.rpc("cell_group_leader_label", {
    p_group_id: String(groupRow.id),
  } as never);

  const { data: meetings } = await supabase
    .from("cell_group_meetings")
    .select("meeting_date, cell_group_attendance(status, member_id)")
    .eq("cell_group_id", String(groupRow.id))
    .order("meeting_date", { ascending: false })
    .limit(8);

  const attendanceRows = ((meetings ?? []) as Array<Record<string, unknown>>).flatMap((meeting) => {
    const marks = (meeting.cell_group_attendance as Array<{ status: string; member_id: string }> | null) ?? [];
    const mine = marks.find((item) => item.member_id === memberRow.id);
    if (!mine) {
      return [];
    }
    return [
      {
        meeting_date: String(meeting.meeting_date),
        status: mine.status as CellGroupAttendanceStatus,
      },
    ];
  });

  return {
    group: {
      id: String(groupRow.id),
      name: String(groupRow.name),
      venue: (groupRow.venue as string | null) ?? null,
      meeting_weekday: groupRow.meeting_weekday == null ? null : Number(groupRow.meeting_weekday),
      meeting_time: (groupRow.meeting_time as string | null) ?? null,
      leader_name: typeof leaderLabel === "string" ? leaderLabel : null,
      role: row.role as CellGroupMemberRole,
      attendance: attendanceRows.filter((item) => item.meeting_date),
    } satisfies PortalCellGroup,
  };
}
