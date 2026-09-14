"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setEventRegistrationStatusAction } from "@/lib/services/event.actions";
import { EVENT_REGISTRATION_STATUSES } from "@/lib/validators/event.schema";
import { eventRegistrationStatusLabel } from "@/lib/utils/format";
import type { EventRegistrationStatus } from "@/types";

type EventRegistrationActionsProps = {
  eventId: string;
  registrationId: string;
  status: EventRegistrationStatus;
};

export function EventRegistrationActions({
  eventId,
  registrationId,
  status,
}: EventRegistrationActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {EVENT_REGISTRATION_STATUSES.filter((value) => value !== status).map((nextStatus) => (
        <ConfirmDialog
          key={nextStatus}
          title={`Mark ${eventRegistrationStatusLabel(nextStatus).toLowerCase()}`}
          message={`This changes the registration to ${eventRegistrationStatusLabel(nextStatus).toLowerCase()}.`}
          confirmLabel={`Mark ${eventRegistrationStatusLabel(nextStatus).toLowerCase()}`}
          triggerLabel={eventRegistrationStatusLabel(nextStatus)}
          onConfirm={() => setEventRegistrationStatusAction(eventId, registrationId, nextStatus)}
        />
      ))}
    </div>
  );
}
