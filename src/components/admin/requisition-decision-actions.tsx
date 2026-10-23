"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { decideRequisitionAction } from "@/lib/services/requisition.actions";

type RequisitionDecisionActionsProps = {
  requisitionId: string;
  requesterName: string;
  amountLabel: string;
};

export function RequisitionDecisionActions({
  requisitionId,
  requesterName,
  amountLabel,
}: RequisitionDecisionActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        title="Approve requisition"
        message={`Approve ${amountLabel} for ${requesterName}?`}
        confirmLabel="Approve"
        triggerLabel="Approve"
        onConfirm={() =>
          decideRequisitionAction({
            requisition_id: requisitionId,
            decision: "APPROVED",
            decision_notes: "",
          })
        }
      />
      <ConfirmDialog
        title="Reject requisition"
        message={`Reject ${amountLabel} for ${requesterName}?`}
        confirmLabel="Reject"
        triggerLabel="Reject"
        onConfirm={() =>
          decideRequisitionAction({
            requisition_id: requisitionId,
            decision: "REJECTED",
            decision_notes: "",
          })
        }
      />
    </div>
  );
}
