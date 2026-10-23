"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Link2,
  Megaphone,
  MonitorSmartphone,
  ScrollText,
  Settings,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { ChurchLogo } from "@/components/ui/church-logo";
import {
  groupAdminNavItems,
  isAdminNavActive,
  type AdminNavItem,
  type AdminNavSection,
} from "@/lib/auth/admin-nav";
import { cn } from "@/lib/utils/cn";

const ICONS = {
  dashboard: LayoutDashboard,
  locations: Building2,
  members: Users,
  cellGroups: UsersRound,
  departments: Briefcase,
  registrations: UserPlus,
  giving: CircleDollarSign,
  requisitions: ClipboardList,
  terminals: MonitorSmartphone,
  paymentButtons: Link2,
  events: CalendarDays,
  announcements: Megaphone,
  reports: BarChart3,
  audit: ScrollText,
  users: UserCog,
  settings: Settings,
  subscriptions: CreditCard,
};

const SECTION_ICONS: Record<string, typeof Wallet> = {
  People: Users,
  Financials: Wallet,
  Engagement: Megaphone,
  Administration: Settings,
};

export type AdminSidebarUser = {
  firstName: string;
  lastName: string;
  roleLabel: string;
  locationLabel: string;
  organizationName: string;
  organizationLogoUrl: string | null;
};

type AdminSidebarProps = {
  items: AdminNavItem[];
  user: AdminSidebarUser;
  variant?: "expanded" | "rail";
};

export function AdminSidebar({ items, user, variant = "expanded" }: AdminSidebarProps) {
  const pathname = usePathname();
  const rail = variant === "rail";
  const sections = groupAdminNavItems(items);
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const hoverLabel = rail
    ? "hidden whitespace-nowrap group-hover/sidebar:inline group-focus-within/sidebar:inline"
    : "whitespace-nowrap";

  return (
    <div className="flex h-full flex-col bg-navy text-white">
      {user.organizationLogoUrl ? (
        <div className="border-b border-white/10 px-3 py-4">
          <ChurchLogo
            src={user.organizationLogoUrl}
            name={user.organizationName}
            className="h-9 w-9 shrink-0 rounded-xl bg-white p-1"
            imageClassName="max-h-7 max-w-7"
          />
        </div>
      ) : null}

      <nav aria-label="Admin" className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        <ul className="space-y-1">
          {sections.map((section) =>
            section.label ? (
              <li key={section.label}>
                <NavDropdown
                  section={{ ...section, label: section.label }}
                  pathname={pathname}
                  hoverLabel={hoverLabel}
                  rail={rail}
                />
              </li>
            ) : (
              section.items.map((item) => (
                <li key={item.href}>
                  <NavItemLink item={item} pathname={pathname} hoverLabel={hoverLabel} />
                </li>
              ))
            ),
          )}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-2 py-4">
        <div className="flex items-center gap-3 px-2">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className={cn("min-w-0", rail && "hidden group-hover/sidebar:block group-focus-within/sidebar:block")}>
            <p className="truncate text-sm font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="mt-0.5 truncate text-xs text-gold">{user.roleLabel}</p>
            <p className="mt-0.5 truncate text-xs text-white/70">{user.locationLabel}</p>
          </div>
        </div>
        <div className="mt-3 px-1">
          <LogoutButton variant="sidebar" compact={rail} />
        </div>
      </div>
    </div>
  );
}

function NavDropdown({
  section,
  pathname,
  hoverLabel,
  rail,
}: {
  section: AdminNavSection & { label: string };
  pathname: string;
  hoverLabel: string;
  rail: boolean;
}) {
  const childActive = section.items.some((item) => isAdminNavActive(item, pathname));
  const [open, setOpen] = useState(childActive);
  const SectionIcon = SECTION_ICONS[section.label] ?? Wallet;

  useEffect(() => {
    if (childActive) {
      setOpen(true);
    }
  }, [childActive]);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`nav-section-${section.label}`}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
          childActive ? "text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
        )}
      >
        <SectionIcon className="size-5 shrink-0" aria-hidden="true" />
        <span className={cn("min-w-0 flex-1 text-left", hoverLabel)}>{section.label}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-white/50 transition-transform",
            open && "rotate-180",
            rail && "hidden group-hover/sidebar:inline group-focus-within/sidebar:inline",
          )}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul id={`nav-section-${section.label}`} className="mt-1 space-y-1 border-l border-white/10 ml-5 pl-2">
          {section.items.map((item) => (
            <li key={item.href}>
              <NavItemLink item={item} pathname={pathname} hoverLabel={hoverLabel} nested />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NavItemLink({
  item,
  pathname,
  hoverLabel,
  nested = false,
}: {
  item: AdminNavItem;
  pathname: string;
  hoverLabel: string;
  nested?: boolean;
}) {
  const Icon = ICONS[item.icon];
  const active = isAdminNavActive(item, pathname);

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-maroon text-white shadow-sm"
          : "text-white/80 hover:bg-white/10 hover:text-white",
        nested && "py-1.5",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={cn("shrink-0", nested ? "size-4" : "size-5")} aria-hidden="true" />
      <span className={hoverLabel}>{item.label}</span>
    </Link>
  );
}
