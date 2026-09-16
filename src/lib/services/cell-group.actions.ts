"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addCellGroupMember,
  createCellGroup,
  deleteCellGroup,
  recordCellGroupAttendance,
  removeCellGroupMember,
  searchLeadersForCellGroup,
  searchMembersForCellGroup,
  updateCellGroup,
} from "@/lib/services/cell-group.service";

function revalidateCellGroupPaths(groupId?: string, memberId?: string) {
  revalidatePath("/admin/cell-groups");
  revalidatePath("/admin/members");
  revalidatePath("/member/cell-group");
  revalidatePath("/member/dashboard");
  revalidatePath("/admin/audit");
  if (groupId) {
    revalidatePath(`/admin/cell-groups/${groupId}`);
  }
  if (memberId) {
    revalidatePath(`/admin/members/${memberId}`);
  }
}

export async function createCellGroupAction(input: unknown) {
  const result = await createCellGroup(input);
  if (result.error || !result.id) {
    return { error: result.error ?? "Unable to create the cell group." };
  }

  revalidateCellGroupPaths(result.id);
  redirect(`/admin/cell-groups/${result.id}`);
}

export async function updateCellGroupAction(groupId: string, input: unknown) {
  const result = await updateCellGroup(groupId, input);
  if (result.error) {
    return { error: result.error };
  }

  revalidateCellGroupPaths(groupId);
  redirect(`/admin/cell-groups/${groupId}`);
}

export async function deleteCellGroupAction(groupId: string) {
  const result = await deleteCellGroup(groupId);
  if (result.error) {
    return { error: result.error };
  }

  revalidateCellGroupPaths();
  redirect("/admin/cell-groups");
}

export async function searchMembersForCellGroupAction(groupId: string, query: string) {
  return searchMembersForCellGroup(groupId, query);
}

export async function searchLeadersForCellGroupAction(locationId: string, query: string) {
  return searchLeadersForCellGroup(locationId, query);
}

export async function addCellGroupMemberAction(input: unknown) {
  const result = await addCellGroupMember(input);
  if (result.error) {
    return { error: result.error };
  }

  const values = input as { cell_group_id?: string; member_id?: string };
  revalidateCellGroupPaths(values.cell_group_id, values.member_id);
  return { ok: true as const, movedFrom: result.movedFrom };
}

export async function removeCellGroupMemberAction(groupId: string, membershipId: string) {
  const result = await removeCellGroupMember(groupId, membershipId);
  if (result.error) {
    return { error: result.error };
  }

  revalidateCellGroupPaths(groupId);
  return { ok: true as const };
}

export async function recordCellGroupAttendanceAction(input: unknown) {
  const result = await recordCellGroupAttendance(input);
  if (result.error) {
    return { error: result.error };
  }

  const values = input as { cell_group_id?: string };
  revalidateCellGroupPaths(values.cell_group_id);
  revalidatePath("/member/cell-group");
  return { ok: true as const };
}
