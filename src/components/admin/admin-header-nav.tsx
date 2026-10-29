"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Settings } from "lucide-react";
import { isAdminNavActive, type AdminNavItem } from "@/lib/auth/admin-nav";
import { ADMIN_NAV_ICONS } from "@/lib/auth/admin-nav-icons";
import { cn } from "@/lib/utils/cn";

type AdminHeaderNavProps = {
  items: AdminNavItem[];
};

export function AdminHeaderNav({ items }: AdminHeaderNavProps) {
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const childActive = items.some((item) => isAdminNavActive(item, pathname));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition",
          childActive || open
            ? "border-navy/15 bg-navy text-white"
            : "border-border bg-card text-navy hover:bg-background",
        )}
      >
        <Settings className="size-3.5 shrink-0" aria-hidden="true" />
        <span>Admin</span>
        <ChevronDown
          className={cn("size-3.5 shrink-0 opacity-70 transition", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Administration"
          className="absolute top-full right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg shadow-navy-deep/10"
        >
          {items.map((item) => {
            const Icon = ADMIN_NAV_ICONS[item.icon];
            const active = isAdminNavActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-navy/5 font-semibold text-navy"
                    : "text-navy/80 hover:bg-background hover:text-navy",
                )}
                onClick={() => setOpen(false)}
              >
                <Icon className="size-4 shrink-0 text-navy/60" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
