"use server";

import { revalidatePath } from "next/cache";
import { setProfileStatus } from "@/lib/services/user.service";

export async function setProfileStatusAction(userId: string, status: string) {
  const result = await setProfileStatus(userId, status);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  return { ok: true as const };
}
