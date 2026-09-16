"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  Megaphone,
  UserRound,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { isMemberNavActive, MEMBER_NAV_ITEMS } from "@/lib/auth/member-nav";
import { cn } from "@/lib/utils/cn";

const ICONS = {
  dashboard: LayoutDashboard,
  profile: UserRound,
  giving: CircleDollarSign,
  events: CalendarDays,
  announcements: Megaphone,
};

type MemberShellProps = {
  firstName: string;
  organizationName: string;
  children: React.ReactNode;
};

export function MemberShell({ firstName, organizationName, children }: MemberShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-20 bg-navy text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">
              {organizationName}
            </p>
            <p className="mt-1 truncate text-sm text-white/85">Welcome, {firstName}</p>
          </div>
          <LogoutButton />
        </div>
        <nav aria-label="Member" className="hidden border-t border-white/10 sm:block">
          <ul className="mx-auto flex w-full max-w-5xl gap-1 px-4 sm:px-6">
            {MEMBER_NAV_ITEMS.map((item) => {
              const active = isMemberNavActive(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block border-b-2 px-3 py-3 text-sm font-medium",
                      active
                        ? "border-gold text-white"
                        : "border-transparent text-white/70 hover:text-white",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 pb-24 sm:px-6 sm:pb-10">
        {children}
      </main>

      <nav
        aria-label="Member"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur sm:hidden"
      >
        <ul className="grid grid-cols-5">
          {MEMBER_NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isMemberNavActive(item.href, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium",
                    active ? "text-maroon" : "text-gray-500",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
