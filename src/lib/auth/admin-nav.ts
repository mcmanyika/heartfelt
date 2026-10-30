import type { AppRole } from "@/types";
import { STAFF_ROLES } from "@/lib/auth/types";

export type AdminNavKey =
  | "dashboard"
  | "members"
  | "cellGroups"
  | "departments"
  | "registrations"
  | "giving"
  | "requisitions"
  | "terminals"
  | "paymentButtons"
  | "subscriptions"
  | "events"
  | "announcements"
  | "reports"
  | "locations"
  | "audit"
  | "users"
  | "settings"
  | "affiliate"
  | "menu";

export type AdminNavItem = {
  key: AdminNavKey;
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
    | "paymentButtons"
    | "events"
    | "announcements"
    | "reports"
    | "audit"
    | "users"
    | "settings"
    | "subscriptions"
    | "requisitions"
    | "affiliate"
    | "menu";
  roles: readonly AppRole[];
  /** Optional sidebar subheading; consecutive items with the same value are grouped. */
  section?: string;
  platformOnly?: boolean;
  matchPrefixes?: readonly string[];
  /** Cannot be disabled per church. */
  alwaysEnabled?: boolean;
};

export type AdminNavSection = {
  label: string | null;
  items: AdminNavItem[];
};

export function isAdminHeaderNavItem(item: AdminNavItem) {
  return item.section === "Administration";
}

export function groupAdminNavItems(items: readonly AdminNavItem[]): AdminNavSection[] {
  const sections: AdminNavSection[] = [];

  for (const item of items) {
    const label = item.section ?? null;
    const last = sections[sections.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
      continue;
    }
    sections.push({ label, items: [item] });
  }

  return sections;
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    key: "dashboard",
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    roles: STAFF_ROLES,
    alwaysEnabled: true,
  },
  {
    key: "members",
    href: "/admin/members",
    label: "Members",
    icon: "members",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
    section: "People",
  },
  {
    key: "cellGroups",
    href: "/admin/cell-groups",
    label: "Cell groups",
    icon: "cellGroups",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
    section: "People",
  },
  {
    key: "departments",
    href: "/admin/departments",
    label: "Departments",
    icon: "departments",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
    section: "People",
  },
  {
    key: "registrations",
    href: "/admin/registrations",
    label: "Registrations",
    icon: "registrations",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
    section: "People",
  },
  {
    key: "giving",
    href: "/admin/transactions",
    label: "Giving & Transactions",
    icon: "giving",
    roles: STAFF_ROLES,
    section: "Financials",
    matchPrefixes: ["/admin/transactions", "/admin/giving"],
  },
  {
    key: "requisitions",
    href: "/admin/requisitions",
    label: "Requisitions",
    icon: "requisitions",
    roles: STAFF_ROLES,
    section: "Financials",
  },
  {
    key: "terminals",
    href: "/admin/terminals",
    label: "Payment Terminals",
    icon: "terminals",
    roles: STAFF_ROLES,
    section: "Financials",
  },
  {
    key: "paymentButtons",
    href: "/admin/payment-buttons",
    label: "Payment buttons",
    icon: "paymentButtons",
    roles: STAFF_ROLES,
    section: "Financials",
  },
  {
    key: "subscriptions",
    href: "/admin/subscriptions",
    label: "Subscriptions",
    icon: "subscriptions",
    roles: STAFF_ROLES,
    section: "Financials",
    platformOnly: true,
  },
  {
    key: "events",
    href: "/admin/events",
    label: "Events",
    icon: "events",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
    section: "Engagement",
  },
  {
    key: "announcements",
    href: "/admin/announcements",
    label: "Announcements",
    icon: "announcements",
    roles: ["SUPER_ADMIN", "LOCATION_ADMIN"],
    section: "Engagement",
  },
  {
    key: "reports",
    href: "/admin/reports",
    label: "Reports",
    icon: "reports",
    roles: STAFF_ROLES,
    section: "Engagement",
  },
  {
    key: "locations",
    href: "/admin/locations",
    label: "Locations",
    icon: "locations",
    roles: ["SUPER_ADMIN"],
    section: "Administration",
  },
  {
    key: "audit",
    href: "/admin/audit",
    label: "Audit log",
    icon: "audit",
    roles: ["SUPER_ADMIN"],
    section: "Administration",
  },
  {
    key: "users",
    href: "/admin/users",
    label: "Users",
    icon: "users",
    roles: ["SUPER_ADMIN"],
    section: "Administration",
  },
  {
    key: "settings",
    href: "/admin/settings",
    label: "Settings",
    icon: "settings",
    roles: ["SUPER_ADMIN"],
    section: "Administration",
  },
  {
    key: "affiliate",
    href: "/admin/affiliate",
    label: "Affiliate",
    icon: "affiliate",
    roles: ["SUPER_ADMIN"],
    section: "Administration",
  },
  {
    key: "menu",
    href: "/admin/menu",
    label: "Menu access",
    icon: "menu",
    roles: STAFF_ROLES,
    section: "Administration",
    platformOnly: true,
    alwaysEnabled: true,
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

export function navKeyFromPathname(pathname: string): AdminNavKey | null {
  const match = ADMIN_NAV_ITEMS.find((item) => {
    if (item.key === "dashboard") {
      return pathname === "/admin/dashboard" || pathname === "/admin";
    }
    const prefixes = item.matchPrefixes ?? [item.href];
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  });
  return match?.key ?? null;
}

export const TOGGLEABLE_ADMIN_NAV_ITEMS = ADMIN_NAV_ITEMS.filter((item) => !item.alwaysEnabled);

export const ADMIN_PAGE_ROLES = {
  dashboard: STAFF_ROLES,
  locations: ["SUPER_ADMIN"] as const,
  members: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  cellGroups: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  departments: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  registrations: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  giving: STAFF_ROLES,
  requisitions: STAFF_ROLES,
  terminals: STAFF_ROLES,
  paymentButtons: STAFF_ROLES,
  events: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  announcements: ["SUPER_ADMIN", "LOCATION_ADMIN"] as const,
  reports: STAFF_ROLES,
  audit: ["SUPER_ADMIN"] as const,
  users: ["SUPER_ADMIN"] as const,
  settings: ["SUPER_ADMIN"] as const,
  affiliate: ["SUPER_ADMIN"] as const,
  menu: STAFF_ROLES,
};
