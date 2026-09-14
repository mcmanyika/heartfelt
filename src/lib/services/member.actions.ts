"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createMember,
  deactivateMember,
  transferMember,
  updateMember,
} from "@/lib/services/member.service";

export async function createMemberAction(input: unknown) {
  const result = await createMember(input);
  if (result.error || !result.id) {
    return { error: result.error ?? "Unable to create the member." };
  }

  revalidatePath("/admin/members");
  redirect(`/admin/members/${result.id}`);
}

export async function updateMemberAction(memberId: string, input: unknown) {
  const result = await updateMember(memberId, input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  redirect(`/admin/members/${memberId}`);
}

export async function deactivateMemberAction(memberId: string) {
  const result = await deactivateMember(memberId);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  return { ok: true as const };
}

export async function transferMemberAction(input: unknown) {
  const result = await transferMember(input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/members");
  if (input && typeof input === "object" && "member_id" in input) {
    revalidatePath(`/admin/members/${(input as { member_id: string }).member_id}`);
  }
  return { ok: true as const };
}
