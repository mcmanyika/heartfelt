"use client";

import { useTransition } from "react";
import { setAdminLocationAction } from "@/lib/auth/admin-location-actions";
import { ALL_LOCATIONS_VALUE } from "@/lib/auth/admin-location-constants";

export type LocationOption = {
  id: string;
  name: string;
  code: string;
};

type LocationSelectorProps = {
  locked: boolean;
  selectedId: string | null;
  locations: LocationOption[];
  selectedLabel?: string;
};

export function LocationSelector({
  locked,
  selectedId,
  locations,
  selectedLabel,
}: LocationSelectorProps) {
  const [isPending, startTransition] = useTransition();

  if (locked) {
    return (
      <p className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy">
        {selectedLabel ?? "Assigned location"}
      </p>
    );
  }

  return (
    <label className="flex min-w-0 items-center gap-2">
      <span className="hidden text-xs font-medium tracking-wide text-gray-500 uppercase sm:inline">
        Location
      </span>
      <select
        aria-label="Filter by location"
        className="max-w-[16rem] rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy outline-none ring-maroon/30 transition focus:border-maroon focus:ring-2 disabled:opacity-70"
        value={selectedId ?? ALL_LOCATIONS_VALUE}
        disabled={isPending}
        onChange={(event) => {
          const value = event.target.value;
          startTransition(async () => {
            await setAdminLocationAction(value);
          });
        }}
      >
        <option value={ALL_LOCATIONS_VALUE}>All locations</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name} ({location.code})
          </option>
        ))}
      </select>
    </label>
  );
}
