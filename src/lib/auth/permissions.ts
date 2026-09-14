import type { AppRole } from "@/types";
import { APP_ROLES } from "@/types";
import {
  ROLE_PRIORITY,
  STAFF_ROLES,
  type CurrentUser,
} from "@/lib/auth/types";

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export function hasRole(
  user: Pick<CurrentUser, "roleNames">,
  role: AppRole,
): boolean {
  return user.roleNames.includes(role);
}

export function hasAnyRole(
  user: Pick<CurrentUser, "roleNames">,
  roles: readonly AppRole[],
): boolean {
  return roles.some((role) => user.roleNames.includes(role));
}

export function isStaffUser(user: Pick<CurrentUser, "roleNames">): boolean {
  return hasAnyRole(user, STAFF_ROLES);
}

export function resolvePrimaryRole(roles: readonly AppRole[]): AppRole | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? roles[0] ?? null;
}

export function getHomePath(user: Pick<CurrentUser, "roleNames">): string {
  if (isStaffUser(user)) {
    return "/admin/dashboard";
  }

  if (hasRole(user, "MEMBER")) {
    return "/member/dashboard";
  }

  return "/forbidden";
}

export function roleLabel(role: AppRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "LOCATION_ADMIN":
      return "Location Admin";
    case "FINANCE":
      return "Finance";
    case "MEMBER":
      return "Member";
  }
}

export function canAccessAdmin(user: Pick<CurrentUser, "roleNames">): boolean {
  return isStaffUser(user);
}

export function canAccessMemberPortal(
  user: Pick<CurrentUser, "roleNames">,
): boolean {
  return hasRole(user, "MEMBER");
}

export function userHasStaffLocation(
  user: Pick<CurrentUser, "isSuperAdmin" | "staffLocationIds">,
  locationId: string,
): boolean {
  if (user.isSuperAdmin) {
    return true;
  }

  return user.staffLocationIds.includes(locationId);
}
