export type MemberNavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "profile" | "giving" | "events" | "announcements";
};

export const MEMBER_NAV_ITEMS: readonly MemberNavItem[] = [
  { href: "/member/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/member/profile", label: "Profile", icon: "profile" },
  { href: "/member/giving", label: "Giving", icon: "giving" },
  { href: "/member/events", label: "Events", icon: "events" },
  { href: "/member/announcements", label: "Announcements", icon: "announcements" },
] as const;

export function isMemberNavActive(href: string, pathname: string) {
  if (href === "/member/dashboard") {
    return pathname === "/member/dashboard" || pathname === "/member";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
