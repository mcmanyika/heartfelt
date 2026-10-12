"use server";

import { redirect } from "next/navigation";
import { packagePlanSchema } from "@/lib/validators/billing.schema";
import { createPackageCheckout } from "@/lib/services/billing.service";

export async function startPackageCheckoutAction(_previous: { error: string } | null, formData: FormData) {
  const parsed = packagePlanSchema.safeParse(formData.get("plan"));
  if (!parsed.success) {
    return { error: "Choose a package." };
  }

  const result = await createPackageCheckout(parsed.data);
  if (result.error || !result.url) {
    return { error: result.error ?? "Checkout could not be started." };
  }

  redirect(result.url);
}
