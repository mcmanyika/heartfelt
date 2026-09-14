"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  ADMIN_LOCATION_COOKIE,
  ALL_LOCATIONS_VALUE,
} from "@/lib/auth/admin-location-constants";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";

export async function setAdminLocationAction(locationId: string) {
  const current = await requireRole(STAFF_ROLES);
  const cookieStore = await cookies();

  if (locationId === ALL_LOCATIONS_VALUE) {
    if (!current.isSuperAdmin) {
      return { error: "You can only view your assigned location." };
    }

    cookieStore.set(ADMIN_LOCATION_COOKIE, ALL_LOCATIONS_VALUE, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  }

  const allowed = current.isSuperAdmin
    ? current.accessibleLocations.some((location) => location.id === locationId)
    : current.staffLocationIds.includes(locationId);

  if (!allowed) {
    return { error: "You do not have access to that location." };
  }

  cookieStore.set(ADMIN_LOCATION_COOKIE, locationId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
