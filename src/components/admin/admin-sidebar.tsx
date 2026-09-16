"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  Megaphone,
  MonitorSmartphone,
  ScrollText,
  Settings,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { ChurchLogo } from "@/components/ui/church-logo";
import { isAdminNavActive, type AdminNavItem } from "@/lib/auth/admin-nav";
import { cn } from "@/lib/utils/cn";

const ICONS = {
  dashboard: LayoutDashboard,
  locations: Building2,
  members: Users,
  cellGroups: UsersRound,
  departments: Briefcase,
  registrations: UserPlus,
  giving: CircleDollarSign,
  terminals: MonitorSmartphone,
  events: CalendarDays,
  announcements: Megaphone,
  reports: BarChart3,
  audit: ScrollText,
  users: UserCog,
  settings: Settings,
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
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isAdminNavActive(item, pathname);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "bg-maroon text-white shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className={hoverLabel}>{item.label}</span>
                </Link>
              </li>
            );
          })}
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
