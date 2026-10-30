"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setOrgNavLinkEnabledAction } from "@/lib/services/nav-access.actions";
import type { OrgNavAccessRow } from "@/lib/services/nav-access.service";
import { cn } from "@/lib/utils/cn";

type MenuAccessTogglesProps = {
  rows: OrgNavAccessRow[];
};

export function MenuAccessToggles({ rows }: MenuAccessTogglesProps) {
  const sections = groupRows(rows);

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.label} className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-xs font-semibold tracking-[0.14em] text-maroon uppercase">
              {section.label}
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {section.items.map((row) => (
              <MenuAccessRow key={row.key} row={row} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MenuAccessRow({ row }: { row: OrgNavAccessRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onToggle() {
    const next = !row.enabled;
    startTransition(async () => {
      const result = await setOrgNavLinkEnabledAction({ navKey: row.key, enabled: next });
      if (!result.error) {
        router.refresh();
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-navy">{row.label}</p>
        {row.platformOnly ? (
          <p className="mt-0.5 text-xs text-gray-500">Platform admin only</p>
        ) : null}
        {row.key === "affiliate" ? (
          <p className="mt-0.5 text-xs text-gray-500">
            Also controls member Referrals
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={row.enabled}
        aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.label}`}
        disabled={pending}
        onClick={onToggle}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition",
          row.enabled ? "bg-navy" : "bg-gray-300",
          pending && "opacity-70",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition",
            row.enabled && "translate-x-5",
          )}
        />
      </button>
    </li>
  );
}

function groupRows(rows: OrgNavAccessRow[]) {
  const sections: Array<{ label: string; items: OrgNavAccessRow[] }> = [];
  for (const row of rows) {
    const label = row.section ?? "Other";
    const last = sections[sections.length - 1];
    if (last && last.label === label) {
      last.items.push(row);
      continue;
    }
    sections.push({ label, items: [row] });
  }
  return sections;
}
