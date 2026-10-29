import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { groupAdminNavItems, type AdminNavItem } from "@/lib/auth/admin-nav";
import { ADMIN_NAV_ICONS } from "@/lib/auth/admin-nav-icons";

type AdminNavTilesProps = {
  items: AdminNavItem[];
};

export function AdminNavTiles({ items }: AdminNavTilesProps) {
  const sections = groupAdminNavItems(items);

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.label ?? "main"} aria-label={section.label ?? "Menu"}>
          {section.label ? (
            <div className="mb-4 flex items-end gap-3">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-maroon uppercase">
                {section.label}
              </h2>
              <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            </div>
          ) : null}
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {section.items.map((item, index) => {
              const Icon = ADMIN_NAV_ICONS[item.icon];
              return (
                <li
                  key={item.href}
                  className="chart-rise"
                  style={{ animationDelay: `${380 + index * 45}ms` }}
                >
                  <Link
                    href={item.href}
                    className="group relative flex h-full min-h-[9rem] flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-card px-4 py-6 text-center text-navy shadow-[0_1px_2px_rgba(11,31,58,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-navy/20 hover:shadow-[0_12px_28px_rgba(11,31,58,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon/40"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(139,30,63,0.06),transparent_55%)] opacity-0 transition duration-200 group-hover:opacity-100"
                    />
                    <ArrowUpRight
                      className="absolute top-3.5 right-3.5 size-4 text-gray-300 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-maroon"
                      aria-hidden="true"
                    />
                    <Icon
                      className="relative size-9 text-navy transition duration-200 group-hover:text-maroon"
                      aria-hidden="true"
                      strokeWidth={1.75}
                    />
                    <span className="relative mt-3 text-[0.95rem] font-semibold leading-snug tracking-tight">
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
