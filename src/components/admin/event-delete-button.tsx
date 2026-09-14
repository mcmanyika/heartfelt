"use client";

import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { deleteEventAction } from "@/lib/services/event.actions";

export function EventDeleteButton({ eventId }: { eventId: string }) {
  return (
    <DeleteRecordButton
      title="Delete this event"
      message="Registrations for this event will be removed. Members will no longer see it."
      onConfirm={() => deleteEventAction(eventId)}
    />
  );
}
