import type { AppRole } from "@/types";
import { STAFF_ROLES } from "@/lib/auth/types";

export type AdminNavItem = {
  href: string;
  label: string;
  icon:
    | "dashboard"
    | "locations"
    | "members"
    | "cellGroups"
    | "departments"
    | "registrations"
    | "giving"
    | "terminals"
    | "events"
    | "announcements"
    | "reports"
    | "audit"
    | "users"
    | "settings";
  roles: readonly AppRole[];
  matchPrefixes?: readonly string[];
};

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    roles: STAFF_ROLES,
  },
  {
    href: "/admin/locations",
    label: "Locations",
    icon: "locations",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/members",
    label: "Members",
    icon: "members",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
  },
  {
    href: "/admin/cell-groups",
    label: "Cell groups",
    icon: "cellGroups",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
  },
  {
    href: "/admin/departments",
    label: "Departments",
    icon: "departments",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
  },
  {
    href: "/admin/registrations",
    label: "Registrations",
    icon: "registrations",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
  },
  {
    href: "/admin/transactions",
    label: "Giving & Transactions",
    icon: "giving",
    roles: STAFF_ROLES,
    matchPrefixes: ["/admin/transactions", "/admin/giving"],
  },
  {
    href: "/admin/terminals",
    label: "Payment Terminals",
    icon: "terminals",
    roles: STAFF_ROLES,
  },
  {
    href: "/admin/events",
    label: "Events",
    icon: "events",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    icon: "announcements",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: "reports",
    roles: STAFF_ROLES,
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    icon: "audit",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "users",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: "settings",
    roles: ["SUPER_ADMIN"],
  },
] as const;

export function isAdminNavActive(item: AdminNavItem, pathname: string) {
  const prefixes = item.matchPrefixes ?? [item.href];

  return prefixes.some((prefix) => {
    if (prefix === "/admin/dashboard") {
      return pathname === "/admin/dashboard" || pathname === "/admin";
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export const ADMIN_PAGE_ROLES = {
  dashboard: STAFF_ROLES,
  locations: ["SUPER_ADMIN"] as const,
  members: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  cellGroups: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  departments: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  registrations: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  giving: STAFF_ROLES,
  terminals: STAFF_ROLES,
  events: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  announcements: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  reports: STAFF_ROLES,
  audit: ["SUPER_ADMIN"] as const,
  users: ["SUPER_ADMIN"] as const,
  settings: ["SUPER_ADMIN"] as const,
};
