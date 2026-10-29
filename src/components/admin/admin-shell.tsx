"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AdminHeaderNav } from "@/components/admin/admin-header-nav";
import { AdminSidebar, type AdminSidebarUser } from "@/components/admin/admin-sidebar";
import { AppFooter } from "@/components/ui/app-footer";
import {
  LocationSelector,
  type LocationOption,
} from "@/components/ui/location-selector";
import { isAdminHeaderNavItem, type AdminNavItem } from "@/lib/auth/admin-nav";

type AdminShellProps = {
  user: AdminSidebarUser;
  navItems: AdminNavItem[];
  locationLocked: boolean;
  selectedLocationId: string | null;
  selectedLocationLabel: string;
  locations: LocationOption[];
  children: React.ReactNode;
};

function isAdminDashboardPath(pathname: string) {
  return pathname === "/admin/dashboard" || pathname === "/admin";
}

export function AdminShell({
  user,
  navItems,
  locationLocked,
  selectedLocationId,
  selectedLocationLabel,
  locations,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const hideSidebar = isAdminDashboardPath(pathname);
  const headerItems = navItems.filter(isAdminHeaderNavItem);
  const sidebarItems = navItems.filter((item) => !isAdminHeaderNavItem(item));
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);

  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (hideSidebar) {
      setOpen(false);
    }
  }, [hideSidebar]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-full bg-background pb-11">
      {!hideSidebar ? (
        <aside className="group/sidebar fixed inset-y-0 left-0 z-40 hidden w-16 overflow-hidden border-r border-navy-deep transition-[width] duration-200 ease-out hover:w-72 hover:shadow-xl focus-within:w-72 lg:block">
          <AdminSidebar items={sidebarItems} user={user} variant="rail" />
        </aside>
      ) : null}

      {!hideSidebar && open ? (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-navy-deep/45 backdrop-blur-sm supports-[backdrop-filter]:bg-navy-deep/35"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside
            id="admin-mobile-nav"
            className="fixed inset-y-0 left-0 z-50 w-72 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
          >
            <AdminSidebar items={sidebarItems} user={user} />
          </aside>
        </div>
      ) : null}

      <div className={hideSidebar ? undefined : "lg:pl-16"}>
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {!hideSidebar ? (
                <button
                  type="button"
                  className="rounded-lg border border-border p-2 text-navy lg:hidden"
                  aria-expanded={open}
                  aria-controls="admin-mobile-nav"
                  aria-label={open ? "Close menu" : "Open menu"}
                  onClick={() => setOpen((current) => !current)}
                >
                  {open ? <X className="size-5" /> : <Menu className="size-5" />}
                </button>
              ) : null}
              {hideSidebar ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{user.organizationName}</p>
                  <p className="truncate text-xs text-gray-500">
                    {user.firstName} {user.lastName} · {user.roleLabel}
                  </p>
                </div>
              ) : (
                <p className="truncate text-sm font-medium text-navy lg:hidden">
                  {user.organizationName}
                </p>
              )}
            </div>
            <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
              <LocationSelector
                locked={locationLocked}
                selectedId={selectedLocationId}
                locations={locations}
                selectedLabel={selectedLocationLabel}
              />
              <AdminHeaderNav items={headerItems} />
            </div>
          </div>
        </header>
        <main
          className={
            hideSidebar ? "px-4 py-3 sm:px-5 lg:px-6" : "px-4 py-6 sm:px-6 lg:px-8"
          }
        >
          {children}
        </main>
      </div>

      <AppFooter className={hideSidebar ? "sm:px-5 lg:px-6" : "lg:pl-24 lg:pr-8"} />
    </div>
  );
}
