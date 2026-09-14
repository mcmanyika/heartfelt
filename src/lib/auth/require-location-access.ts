import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/log-server-error";
import type { CurrentUser } from "@/lib/auth/types";

/**
 * Verifies the caller may act on a location.
 * Looks up the location in the database — never trusts a browser-supplied org/location pair.
 */
export async function requireLocationAccess(
  locationId: string,
): Promise<CurrentUser> {
  const current = await requireUser();
  const supabase = await createClient();

  const { data: locationData, error } = await supabase
    .from("locations")
    .select("id, organization_id")
    .eq("id", locationId)
    .maybeSingle();

  const location = locationData as { id: string; organization_id: string } | null;

  if (error) {
    logServerError("require-location-access", error);
    redirect("/forbidden");
  }

  if (!location || location.organization_id !== current.organizationId) {
    redirect("/forbidden");
  }

  if (current.isSuperAdmin) {
    return current;
  }

  const assigned = current.assignments.some(
    (assignment) =>
      assignment.locationId === location.id &&
      (assignment.role === "LOCATION_ADMIN" || assignment.role === "FINANCE"),
  );

  if (!assigned) {
    redirect("/forbidden");
  }

  return current;
}
