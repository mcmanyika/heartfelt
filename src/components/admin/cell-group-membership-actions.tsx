"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  confirmCellGroupMembershipAction,
  declineCellGroupMembershipAction,
} from "@/lib/services/cell-group.actions";

type CellGroupMembershipActionsProps = {
  membershipId: string;
  memberName: string;
};

export function CellGroupMembershipActions({
  membershipId,
  memberName,
}: CellGroupMembershipActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        title="Confirm membership"
        message={`Confirm ${memberName} as an active member of this cell group.`}
        confirmLabel="Confirm"
        triggerLabel="Confirm"
        onConfirm={() => confirmCellGroupMembershipAction(membershipId)}
      />
      <ConfirmDialog
        title="Decline request"
        message={`Decline ${memberName}'s request to join this cell group.`}
        confirmLabel="Decline"
        triggerLabel="Decline"
        onConfirm={() => declineCellGroupMembershipAction(membershipId)}
      />
    </div>
  );
}
