"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  confirmDepartmentMembershipAction,
  declineDepartmentMembershipAction,
} from "@/lib/services/department.actions";

type DepartmentMembershipActionsProps = {
  membershipId: string;
  memberName: string;
};

export function DepartmentMembershipActions({
  membershipId,
  memberName,
}: DepartmentMembershipActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        title="Confirm membership"
        message={`Confirm ${memberName} as an active member of this department.`}
        confirmLabel="Confirm"
        triggerLabel="Confirm"
        onConfirm={() => confirmDepartmentMembershipAction(membershipId)}
      />
      <ConfirmDialog
        title="Decline request"
        message={`Decline ${memberName}'s request to join this department.`}
        confirmLabel="Decline"
        triggerLabel="Decline"
        onConfirm={() => declineDepartmentMembershipAction(membershipId)}
      />
    </div>
  );
}
