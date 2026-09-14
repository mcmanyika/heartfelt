"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createEvent,
  deleteEvent,
  setEventRegistrationStatus,
  updateEvent,
} from "@/lib/services/event.service";
import type { EventRegistrationStatus } from "@/types";

function revalidateEventPaths(eventId?: string) {
  revalidatePath("/admin/events");
  revalidatePath("/admin/dashboard");
  revalidatePath("/member/events");
  revalidatePath("/member/dashboard");
  if (eventId) {
    revalidatePath(`/admin/events/${eventId}`);
  }
}

export async function createEventAction(input: unknown) {
  const result = await createEvent(input);
  if (result.error || !result.id) {
    return { error: result.error ?? "Unable to create the event." };
  }

  revalidateEventPaths(result.id);
  redirect(`/admin/events/${result.id}`);
}

export async function updateEventAction(eventId: string, input: unknown) {
  const result = await updateEvent(eventId, input);
  if (result.error) {
    return { error: result.error };
  }

  revalidateEventPaths(eventId);
  redirect(`/admin/events/${eventId}`);
}

export async function deleteEventAction(eventId: string) {
  const result = await deleteEvent(eventId);
  if (result.error) {
    return { error: result.error };
  }

  revalidateEventPaths();
  redirect("/admin/events");
}

export async function setEventRegistrationStatusAction(
  eventId: string,
  registrationId: string,
  status: EventRegistrationStatus,
) {
  const result = await setEventRegistrationStatus(eventId, registrationId, status);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true as const };
}
