"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Filter, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { fieldClassName } from "@/components/ui/form-field";
import { withQuery } from "@/lib/admin/query-string";
import { formatDate } from "@/lib/utils/format";

type DashboardFiltersButtonProps = {
  from: string;
  to: string;
  isDefaultRange: boolean;
};

export function DashboardFiltersButton({
  from,
  to,
  isDefaultRange,
}: DashboardFiltersButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const titleId = "dashboard-filters-title";

  function navigate(nextFrom?: string, nextTo?: string) {
    const href = withQuery(
      "/admin/dashboard",
      {},
      {
        from: nextFrom || undefined,
        to: nextTo || undefined,
      },
    );
    setOpen(false);
    startTransition(() => {
      router.push(href);
      router.refresh();
    });
  }

  function onApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextFrom = String(form.get("from") ?? "").trim();
    const nextTo = String(form.get("to") ?? "").trim();
    navigate(nextFrom, nextTo);
  }

  function clearFilters() {
    navigate();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-navy transition hover:bg-background"
        aria-haspopup="dialog"
        disabled={isPending}
      >
        <Filter className="size-4 shrink-0" aria-hidden="true" />
        Filters
        {!isDefaultRange ? (
          <span className="rounded-md bg-navy/5 px-1.5 py-0.5 text-xs font-semibold text-navy">
            {formatDate(from)} – {formatDate(to)}
          </span>
        ) : null}
      </button>

      {open ? (
        <Modal onClose={() => setOpen(false)} labelledBy={titleId} className="max-w-md p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-navy">
                Dashboard filters
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Limit giving gauges and charts to a date range.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-border p-1.5 text-navy hover:bg-background"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={onApply} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-navy" htmlFor="dashboard-from">
              From
              <input
                id="dashboard-from"
                type="date"
                name="from"
                defaultValue={from}
                required
                disabled={isPending}
                className={`${fieldClassName} mt-1.5`}
              />
            </label>
            <label className="block text-sm font-medium text-navy" htmlFor="dashboard-to">
              To
              <input
                id="dashboard-to"
                type="date"
                name="to"
                defaultValue={to}
                required
                disabled={isPending}
                className={`${fieldClassName} mt-1.5`}
              />
            </label>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {!isDefaultRange ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={isPending}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-navy hover:bg-background disabled:opacity-70"
                >
                  Reset
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-navy hover:bg-background disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-maroon px-3 py-2 text-sm font-semibold text-white hover:bg-[#761834] disabled:opacity-70"
              >
                {isPending ? "Applying..." : "Apply"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
