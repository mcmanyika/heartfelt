"use server";

import { revalidatePath } from "next/cache";
import {
  createFamilyLink,
  removeFamilyLink,
  searchMembersForFamily,
} from "@/lib/services/family.service";

export async function searchMembersForFamilyAction(memberId: string, query: string) {
  return searchMembersForFamily(memberId, query);
}

export async function createFamilyLinkAction(input: unknown) {
  const result = await createFamilyLink(input);
  if (result.error) {
    return { error: result.error };
  }

  if (input && typeof input === "object" && "member_id" in input && "related_member_id" in input) {
    const values = input as { member_id: string; related_member_id: string };
    revalidatePath(`/admin/members/${values.member_id}`);
    revalidatePath(`/admin/members/${values.related_member_id}`);
  }
  revalidatePath("/admin/members");
  revalidatePath("/member/profile");
  revalidatePath("/admin/audit");
  return { ok: true as const };
}

export async function removeFamilyLinkAction(memberId: string, linkId: string) {
  const result = await removeFamilyLink(memberId, linkId);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  revalidatePath("/member/profile");
  revalidatePath("/admin/audit");
  return { ok: true as const };
}
