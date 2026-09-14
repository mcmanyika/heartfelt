"use client";

import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { deleteAnnouncementAction } from "@/lib/services/announcement.actions";

export function AnnouncementDeleteButton({ announcementId }: { announcementId: string }) {
  return (
    <DeleteRecordButton
      title="Delete this announcement"
      message="Members will stop seeing this notice immediately."
      onConfirm={() => deleteAnnouncementAction(announcementId)}
    />
  );
}
