"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createLocation,
  setLocationStatus,
  updateLocation,
} from "@/lib/services/location.service";
import type { LocationStatus } from "@/types";

export async function createLocationAction(input: unknown) {
  const result = await createLocation(input);
  if (result.error || !result.id) {
    return { error: result.error ?? "Unable to create the location." };
  }

  revalidatePath("/admin/locations");
  redirect(`/admin/locations/${result.id}`);
}

export async function updateLocationAction(locationId: string, input: unknown) {
  const result = await updateLocation(locationId, input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/locations");
  revalidatePath(`/admin/locations/${locationId}`);
  redirect(`/admin/locations/${locationId}`);
}

export async function setLocationStatusAction(
  locationId: string,
  status: LocationStatus,
) {
  const result = await setLocationStatus(locationId, status);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/locations");
  revalidatePath(`/admin/locations/${locationId}`);
  return { ok: true as const };
}
