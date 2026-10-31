"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { SpeedometerGauge } from "@/components/charts/speedometer-gauge";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { paymentMethodLabel, terminalStatusLabel } from "@/lib/utils/format";

type TerminalDetail = {
  id: string;
  status: string;
  code: string;
  name: string;
  locationLabel: string;
};

type LocationDetail = {
  id: string;
  name: string;
  code: string;
  status: string;
  memberCount: number;
};

type GivingMethodDetail = {
  name: string;
  count: number;
};

type DashboardGaugesProps = {
  onlineTerminals: number;
  terminalCount: number;
  terminals: TerminalDetail[];
  digitalGifts: number;
  giftsInRange: number;
  byMethod: GivingMethodDetail[];
  activeLocations: number;
  locationCount: number;
  locations: LocationDetail[];
};

type GaugeModal = "terminals" | "giving" | "locations" | null;

export function DashboardGauges({
  onlineTerminals,
  terminalCount,
  terminals,
  digitalGifts,
  giftsInRange,
  byMethod,
  activeLocations,
  locationCount,
  locations,
}: DashboardGaugesProps) {
  const [open, setOpen] = useState<GaugeModal>(null);
  const titleId = useId();

  return (
    <>
      <section aria-label="Performance gauges" className="mb-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="rounded-md text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon/40"
          onClick={() => setOpen("terminals")}
        >
          <SpeedometerGauge
            label="Terminals online"
            value={onlineTerminals}
            max={terminalCount}
            animationDelayMs={0}
            detail={
              terminalCount === 0
                ? "No terminals registered"
                : `${onlineTerminals} of ${terminalCount} online`
            }
          />
        </button>
        <button
          type="button"
          className="rounded-md text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon/40"
          onClick={() => setOpen("giving")}
        >
          <SpeedometerGauge
            label="Digital giving"
            value={digitalGifts}
            max={giftsInRange}
            animationDelayMs={90}
            detail={
              giftsInRange === 0
                ? "No gifts in this range"
                : `${digitalGifts} of ${giftsInRange} non-cash`
            }
          />
        </button>
        <button
          type="button"
          className="rounded-md text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon/40"
          onClick={() => setOpen("locations")}
        >
          <SpeedometerGauge
            label="Locations active"
            value={activeLocations}
            max={locationCount}
            animationDelayMs={180}
            detail={
              locationCount === 0
                ? "No locations in scope"
                : `${activeLocations} of ${locationCount} active`
            }
          />
        </button>
      </section>

      {open ? (
        <Modal
          onClose={() => setOpen(null)}
          labelledBy={titleId}
          className="max-h-[85vh] max-w-lg overflow-y-auto p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-navy">
                {open === "terminals"
                  ? "Terminals"
                  : open === "giving"
                    ? "Giving in range"
                    : "Locations"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {open === "terminals"
                  ? `${onlineTerminals} of ${terminalCount} online`
                  : open === "giving"
                    ? `${digitalGifts} of ${giftsInRange} non-cash gifts`
                    : `${activeLocations} of ${locationCount} active`}
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-border p-1.5 text-navy hover:bg-background"
              aria-label="Close"
              onClick={() => setOpen(null)}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4">
            {open === "terminals" ? <TerminalsDetail terminals={terminals} /> : null}
            {open === "giving" ? (
              <GivingDetail
                byMethod={byMethod}
                digitalGifts={digitalGifts}
                giftsInRange={giftsInRange}
              />
            ) : null}
            {open === "locations" ? <LocationsDetail locations={locations} /> : null}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function TerminalsDetail({ terminals }: { terminals: TerminalDetail[] }) {
  if (terminals.length === 0) {
    return <p className="text-sm text-gray-600">No terminals registered in this scope.</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-md border border-border">
        {terminals.map((terminal) => (
          <li key={terminal.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-navy">{terminal.name}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {terminal.code} · {terminal.locationLabel}
              </p>
            </div>
            <StatusBadge status={terminal.status} label={terminalStatusLabel(terminal.status)} />
          </li>
        ))}
      </ul>
      <Link
        href="/admin/terminals"
        className="inline-flex text-sm font-medium text-maroon hover:underline"
      >
        Manage terminals
      </Link>
    </div>
  );
}

function GivingDetail({
  byMethod,
  digitalGifts,
  giftsInRange,
}: {
  byMethod: GivingMethodDetail[];
  digitalGifts: number;
  giftsInRange: number;
}) {
  const cashCount = byMethod.find((row) => row.name === "CASH" || row.name === "Cash")?.count ?? 0;
  const rows = byMethod.length
    ? byMethod
    : [
        { name: "Cash", count: cashCount },
        { name: "Digital", count: digitalGifts },
      ].filter((row) => row.count > 0);

  if (giftsInRange === 0) {
    return <p className="text-sm text-gray-600">No successful gifts in this date range.</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-md border border-border">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="text-sm font-medium text-navy">{paymentMethodLabel(row.name)}</span>
            <span className="tabular-nums text-sm text-gray-600">
              {row.count.toLocaleString("en-US")}{" "}
              <span className="text-gray-400">
                ({giftsInRange ? Math.round((row.count / giftsInRange) * 100) : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/admin/transactions"
        className="inline-flex text-sm font-medium text-maroon hover:underline"
      >
        View transactions
      </Link>
    </div>
  );
}

function LocationsDetail({ locations }: { locations: LocationDetail[] }) {
  if (locations.length === 0) {
    return <p className="text-sm text-gray-600">No locations in this scope.</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-md border border-border">
        {locations.map((location) => (
          <li key={location.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-navy">
                {location.name} ({location.code})
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {location.memberCount.toLocaleString("en-US")} members
              </p>
            </div>
            <StatusBadge
              status={location.status}
              label={location.status === "ACTIVE" ? "Active" : "Inactive"}
            />
          </li>
        ))}
      </ul>
      <Link
        href="/admin/locations"
        className="inline-flex text-sm font-medium text-maroon hover:underline"
      >
        Manage locations
      </Link>
    </div>
  );
}
