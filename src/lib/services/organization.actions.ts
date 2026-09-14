"use server";

import { revalidatePath } from "next/cache";
import { updateOrganization } from "@/lib/services/organization.service";

export async function updateOrganizationAction(input: unknown) {
  const result = await updateOrganization(input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/audit");
  return { ok: true as const };
}
