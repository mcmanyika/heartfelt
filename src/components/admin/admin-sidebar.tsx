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
  organizationShortCode: string;
  organizationLogoUrl: string | null;
};

type AdminSidebarProps = {
  items: AdminNavItem[];
  user: AdminSidebarUser;
};

export function AdminSidebar({ items, user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <ChurchLogo
          src={user.organizationLogoUrl}
          name={user.organizationName}
          className="mb-3 h-12 w-12 rounded-xl bg-white p-1.5"
          imageClassName="max-h-9 max-w-9"
        />
        <p className="text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">
          {user.organizationShortCode}
        </p>
        <p className="mt-2 text-sm leading-5 font-semibold">
          {user.organizationName}
        </p>
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isAdminNavActive(item, pathname);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "bg-maroon text-white shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <p className="truncate text-sm font-medium">
          {user.firstName} {user.lastName}
        </p>
        <p className="mt-0.5 truncate text-xs text-gold">{user.roleLabel}</p>
        <p className="mt-0.5 truncate text-xs text-white/70">{user.locationLabel}</p>
        <div className="mt-3">
          <LogoutButton variant="sidebar" />
        </div>
      </div>
    </div>
  );
}
