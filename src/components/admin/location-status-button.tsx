"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setLocationStatusAction } from "@/lib/services/location.actions";
import type { LocationStatus } from "@/types";

type LocationStatusButtonProps = {
  locationId: string;
  status: LocationStatus;
};

export function LocationStatusButton({ locationId, status }: LocationStatusButtonProps) {
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const label = nextStatus === "INACTIVE" ? "Deactivate" : "Activate";

  return (
    <ConfirmDialog
      title={`${label} location`}
      message={
        nextStatus === "INACTIVE"
          ? "This campus will be marked inactive. Existing records stay in place."
          : "This campus will be marked active again."
      }
      confirmLabel={label}
      triggerLabel={label}
      onConfirm={() => setLocationStatusAction(locationId, nextStatus)}
    />
  );
}
