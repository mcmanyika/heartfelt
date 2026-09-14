import { cookies } from "next/headers";
import {
  ADMIN_LOCATION_COOKIE,
  ALL_LOCATIONS_VALUE,
} from "@/lib/auth/admin-location-constants";
import type { AccessibleLocation, CurrentUser } from "@/lib/auth/types";

export { ADMIN_LOCATION_COOKIE, ALL_LOCATIONS_VALUE };

export type AdminLocationSelection = {
  locationId: string | null;
  location: AccessibleLocation | null;
  locked: boolean;
};

export function resolveAdminLocationSelection(
  user: CurrentUser,
  cookieValue: string | undefined,
): AdminLocationSelection {
  if (!user.isSuperAdmin) {
    const locationId = user.staffLocationIds[0] ?? user.primaryLocationId;
    const location =
      user.accessibleLocations.find((item) => item.id === locationId) ??
      user.accessibleLocations[0] ??
      null;

    return {
      locationId: location?.id ?? null,
      location,
      locked: true,
    };
  }

  if (!cookieValue || cookieValue === ALL_LOCATIONS_VALUE) {
    return {
      locationId: null,
      location: null,
      locked: false,
    };
  }

  const location = user.accessibleLocations.find((item) => item.id === cookieValue);

  if (!location) {
    return {
      locationId: null,
      location: null,
      locked: false,
    };
  }

  return {
    locationId: location.id,
    location,
    locked: false,
  };
}

export async function getAdminLocationSelection(
  user: CurrentUser,
): Promise<AdminLocationSelection> {
  const cookieStore = await cookies();
  return resolveAdminLocationSelection(
    user,
    cookieStore.get(ADMIN_LOCATION_COOKIE)?.value,
  );
}
