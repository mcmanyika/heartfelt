"use server";

import { revalidatePath } from "next/cache";
import {
  cancelEventRegistration,
  registerForEvent,
  updateMyProfile,
} from "@/lib/services/portal.service";

export async function updateMyProfileAction(input: unknown) {
  const result = await updateMyProfile(input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/member");
  revalidatePath("/member/profile");
  revalidatePath("/member/dashboard");
  return { ok: true as const };
}

export async function registerForEventAction(eventId: string) {
  const result = await registerForEvent(eventId);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/member/events");
  revalidatePath("/member/dashboard");
  return { ok: true as const };
}

export async function cancelEventRegistrationAction(eventId: string) {
  const result = await cancelEventRegistration(eventId);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/member/events");
  revalidatePath("/member/dashboard");
  return { ok: true as const };
}
