"use server";

import { redirect } from "next/navigation";
import { createMemberGivingCheckout } from "@/lib/services/member-giving.service";

export async function startMemberGivingCheckoutAction(input: unknown) {
  const result = await createMemberGivingCheckout(input);
  if (result.error || !result.url) {
    return { error: result.error ?? "Checkout could not be started." };
  }

  redirect(result.url);
}
