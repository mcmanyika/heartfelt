import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, resolvePrimaryRole } from "@/lib/auth/permissions";
import type { AccessibleLocation, CurrentUser, RoleAssignment } from "@/lib/auth/types";
import type { Database } from "@/types/database.types";
import { logServerError } from "@/lib/utils/log-server-error";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type RoleJoinRow = {
  organization_id: string;
  location_id: string | null;
  roles: { name: string } | { name: string }[] | null;
};

function roleNameFromJoin(roles: RoleJoinRow["roles"]): string | null {
  if (!roles) {
    return null;
  }

  return Array.isArray(roles) ? (roles[0]?.name ?? null) : roles.name;
}

export async function loadCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logServerError("get-current-user.auth", userError);
    return null;
  }

  if (!user) {
    return null;
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, organization_id, location_id, first_name, last_name, phone, avatar_url, status",
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as Pick<
    ProfileRow,
    | "id"
    | "organization_id"
    | "location_id"
    | "first_name"
    | "last_name"
    | "phone"
    | "avatar_url"
    | "status"
  > | null;

  if (profileError) {
    logServerError("get-current-user.profile", profileError);
    return null;
  }

  if (!profile) {
    return null;
  }

  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("organization_id, location_id, roles!inner(name)")
    .eq("user_id", user.id)
    .eq("organization_id", profile.organization_id);

  const roleRows = (roleData ?? []) as RoleJoinRow[];

  if (roleError) {
    logServerError("get-current-user.roles", roleError);
    return null;
  }

  const assignments: RoleAssignment[] = roleRows.flatMap((row) => {
    const name = roleNameFromJoin(row.roles);
    if (!name || !isAppRole(name)) {
      return [];
    }

    return [
      {
        role: name,
        organizationId: row.organization_id,
        locationId: row.location_id,
      },
    ];
  });

  const roleNames = [...new Set(assignments.map((assignment) => assignment.role))];
  const isSuperAdmin = roleNames.includes("SUPER_ADMIN");
  const staffLocationIds = [
    ...new Set(
      assignments
        .filter(
          (assignment) =>
            assignment.locationId &&
            (assignment.role === "LOCATION_ADMIN" ||
              assignment.role === "FINANCE" ||
              assignment.role === "SUPER_ADMIN"),
        )
        .map((assignment) => assignment.locationId as string),
    ),
  ];

  let accessibleLocations: AccessibleLocation[] = [];

  if (isSuperAdmin) {
    const { data: locations, error: locationsError } = await supabase
      .from("locations")
      .select("id, name, code, city, country, status")
      .eq("organization_id", profile.organization_id)
      .order("name");

    if (locationsError) {
      logServerError("get-current-user.locations", locationsError);
    } else {
      accessibleLocations = (locations ?? []) as AccessibleLocation[];
    }
  } else {
    const locationIds = [
      ...new Set(
        [
          ...staffLocationIds,
          profile.location_id,
        ].filter((value): value is string => Boolean(value)),
      ),
    ];

    if (locationIds.length > 0) {
      const { data: locations, error: locationsError } = await supabase
        .from("locations")
        .select("id, name, code, city, country, status")
        .eq("organization_id", profile.organization_id)
        .in("id", locationIds)
        .order("name");

      if (locationsError) {
        logServerError("get-current-user.locations", locationsError);
      } else {
        accessibleLocations = (locations ?? []) as AccessibleLocation[];
      }
    }
  }

  return {
    id: user.id,
    email: user.email ?? "",
    profile,
    organizationId: profile.organization_id,
    assignments,
    roleNames,
    primaryRole: resolvePrimaryRole(roleNames),
    isSuperAdmin,
    isLocationAdmin: roleNames.includes("LOCATION_ADMIN"),
    isFinance: roleNames.includes("FINANCE"),
    isMember: roleNames.includes("MEMBER"),
    isStaff: isSuperAdmin || roleNames.includes("LOCATION_ADMIN") || roleNames.includes("FINANCE"),
    profileStatus: profile.status,
    primaryLocationId: profile.location_id,
    staffLocationIds: isSuperAdmin
      ? accessibleLocations.map((location) => location.id)
      : staffLocationIds,
    accessibleLocations,
  };
}

export const getCurrentUser = cache(loadCurrentUser);
