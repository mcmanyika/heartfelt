"use client";

import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { deleteCellGroupAction } from "@/lib/services/cell-group.actions";

export function CellGroupDeleteButton({ groupId }: { groupId: string }) {
  return (
    <DeleteRecordButton
      title="Delete this cell group"
      message="The roster and attendance history for this group will be removed."
      onConfirm={() => deleteCellGroupAction(groupId)}
    />
  );
}
