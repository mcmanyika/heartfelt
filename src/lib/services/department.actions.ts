"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addDepartmentMember,
  createDepartment,
  deleteDepartment,
  joinMyDepartment,
  leaveMyDepartment,
  removeDepartmentMember,
  searchLeadersForDepartment,
  searchMembersForDepartment,
  updateDepartment,
} from "@/lib/services/department.service";

function revalidateDepartmentPaths(departmentId?: string, memberId?: string) {
  revalidatePath("/admin/departments");
  revalidatePath("/admin/members");
  revalidatePath("/member/departments");
  revalidatePath("/member/dashboard");
  revalidatePath("/member/profile");
  revalidatePath("/admin/audit");
  if (departmentId) {
    revalidatePath(`/admin/departments/${departmentId}`);
  }
  if (memberId) {
    revalidatePath(`/admin/members/${memberId}`);
  }
}

export async function createDepartmentAction(input: unknown) {
  const result = await createDepartment(input);
  if (result.error || !result.id) {
    return { error: result.error ?? "Unable to create the department." };
  }

  revalidateDepartmentPaths(result.id);
  redirect(`/admin/departments/${result.id}`);
}

export async function updateDepartmentAction(departmentId: string, input: unknown) {
  const result = await updateDepartment(departmentId, input);
  if (result.error) {
    return { error: result.error };
  }

  revalidateDepartmentPaths(departmentId);
  redirect(`/admin/departments/${departmentId}`);
}

export async function deleteDepartmentAction(departmentId: string) {
  const result = await deleteDepartment(departmentId);
  if (result.error) {
    return { error: result.error };
  }

  revalidateDepartmentPaths();
  redirect("/admin/departments");
}

export async function searchMembersForDepartmentAction(departmentId: string, query: string) {
  return searchMembersForDepartment(departmentId, query);
}

export async function searchLeadersForDepartmentAction(locationId: string, query: string) {
  return searchLeadersForDepartment(locationId, query);
}

export async function addDepartmentMemberAction(input: unknown) {
  const result = await addDepartmentMember(input);
  if (result.error) {
    return { error: result.error };
  }

  const values = input as { department_id?: string; member_id?: string };
  revalidateDepartmentPaths(values.department_id, values.member_id);
  return { ok: true as const };
}

export async function removeDepartmentMemberAction(departmentId: string, membershipId: string) {
  const result = await removeDepartmentMember(departmentId, membershipId);
  if (result.error) {
    return { error: result.error };
  }

  revalidateDepartmentPaths(departmentId, result.memberId);
  return { ok: true as const };
}

export async function joinMyDepartmentAction(input: unknown) {
  const result = await joinMyDepartment(input);
  if (result.error) {
    return { error: result.error };
  }

  const values = input as { department_id?: string };
  revalidateDepartmentPaths(values.department_id);
  return { ok: true as const };
}

export async function leaveMyDepartmentAction(departmentId: string) {
  const result = await leaveMyDepartment(departmentId);
  if (result.error) {
    return { error: result.error };
  }

  revalidateDepartmentPaths(departmentId);
  return { ok: true as const };
}
