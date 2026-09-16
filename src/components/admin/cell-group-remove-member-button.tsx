"use client";

import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { removeCellGroupMemberAction } from "@/lib/services/cell-group.actions";

type CellGroupRemoveMemberButtonProps = {
  groupId: string;
  membershipId: string;
  memberName: string;
};

export function CellGroupRemoveMemberButton({
  groupId,
  membershipId,
  memberName,
}: CellGroupRemoveMemberButtonProps) {
  return (
    <DeleteRecordButton
      title="Remove this member"
      message={`${memberName} will leave this cell group. Attendance already recorded is kept.`}
      confirmLabel="Remove"
      triggerLabel="Remove"
      onConfirm={() => removeCellGroupMemberAction(groupId, membershipId)}
    />
  );
}
