"use server";

import { redirect } from "next/navigation";
import {
  cancelEventRegistrationCheckout,
  createEventRegistrationCheckout,
  reconcileEventRegistrationSession,
} from "@/lib/services/event-registration-payment.service";

export async function startEventRegistrationCheckoutAction(eventId: string) {
  const result = await createEventRegistrationCheckout(eventId);
  if (result.error || !result.url) {
    return { error: result.error ?? "Checkout could not be started." };
  }

  redirect(result.url);
}

export async function reconcileEventRegistrationSessionAction(sessionId: string) {
  await reconcileEventRegistrationSession(sessionId);
}

export async function cancelEventRegistrationCheckoutAction(sessionId: string) {
  await cancelEventRegistrationCheckout(sessionId);
}
