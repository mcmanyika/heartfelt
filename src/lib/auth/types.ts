import type { AppRole, Profile, ProfileStatus } from "@/types";

export type RoleAssignment = {
  role: AppRole;
  organizationId: string;
  locationId: string | null;
};

export type AccessibleLocation = {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  status: "ACTIVE" | "INACTIVE";
};

export type CurrentUser = {
  id: string;
  email: string;
  profile: Pick<
    Profile,
    | "id"
    | "organization_id"
    | "location_id"
    | "first_name"
    | "last_name"
    | "phone"
    | "avatar_url"
    | "status"
  >;
  organizationId: string;
  assignments: RoleAssignment[];
  roleNames: AppRole[];
  primaryRole: AppRole | null;
  isSuperAdmin: boolean;
  isLocationAdmin: boolean;
  isFinance: boolean;
  isMember: boolean;
  isStaff: boolean;
  profileStatus: ProfileStatus;
  primaryLocationId: string | null;
  staffLocationIds: string[];
  accessibleLocations: AccessibleLocation[];
};

export const STAFF_ROLES: readonly AppRole[] = [
  "SUPER_ADMIN",
  "LOCATION_ADMIN",
  "FINANCE",
] as const;

export const ROLE_PRIORITY: readonly AppRole[] = [
  "SUPER_ADMIN",
  "LOCATION_ADMIN",
  "FINANCE",
  "MEMBER",
] as const;
