"use server";

import { revalidatePath } from "next/cache";
import { setProfileStatus, setUserRoles } from "@/lib/services/user.service";

export async function setProfileStatusAction(userId: string, status: string) {
  const result = await setProfileStatus(userId, status);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  return { ok: true as const };
}

export async function setUserRolesAction(input: unknown) {
  const result = await setUserRoles(input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  revalidatePath("/admin/dashboard");
  return { ok: true as const };
}
