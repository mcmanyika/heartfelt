"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  activateMemberRegistration,
  registerMemberAccount,
} from "@/lib/services/registration.service";

export async function registerMemberAction(input: unknown) {
  const result = await registerMemberAccount(input);
  if (result.error) {
    return { error: result.error };
  }

  redirect("/login?reason=pending");
}

export async function activateMemberRegistrationAction(memberId: string) {
  const result = await activateMemberRegistration(memberId);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  return { ok: true as const };
}
