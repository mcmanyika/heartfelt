"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createEmbedGivingCheckout,
  createPaymentButton,
  setPaymentButtonActive,
  updatePaymentButton,
} from "@/lib/services/payment-button.service";

export async function createPaymentButtonAction(input: unknown) {
  const result = await createPaymentButton(input);
  if (result.error || !result.id) {
    return { error: result.error ?? "Unable to create the payment button." };
  }

  revalidatePath("/admin/payment-buttons");
  redirect(`/admin/payment-buttons/${result.id}`);
}

export async function updatePaymentButtonAction(buttonId: string, input: unknown) {
  const result = await updatePaymentButton(buttonId, input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/payment-buttons");
  revalidatePath(`/admin/payment-buttons/${buttonId}`);
  redirect(`/admin/payment-buttons/${buttonId}`);
}

export async function setPaymentButtonActiveAction(buttonId: string, active: boolean) {
  const result = await setPaymentButtonActive(buttonId, active);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/payment-buttons");
  revalidatePath(`/admin/payment-buttons/${buttonId}`);
  return { ok: true as const };
}

export async function startEmbedGivingCheckoutAction(input: unknown) {
  const result = await createEmbedGivingCheckout(input);
  if (result.error || !result.url) {
    return { error: result.error ?? "Checkout could not be started." };
  }

  redirect(result.url);
}
