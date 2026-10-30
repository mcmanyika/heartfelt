"use server";

import { revalidatePath } from "next/cache";
import { setOrgNavLinkEnabled } from "@/lib/services/nav-access.service";

export async function setOrgNavLinkEnabledAction(input: { navKey: string; enabled: boolean }) {
  const result = await setOrgNavLinkEnabled(input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/menu");
  revalidatePath("/admin/dashboard");
  return { ok: true as const };
}
