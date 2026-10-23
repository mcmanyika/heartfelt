"use client";

import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cancelMyRequisitionAction } from "@/lib/services/requisition.actions";
import type { RequisitionListItem } from "@/lib/services/requisition.service";
import {
  formatAmount,
  formatDateTime,
  requisitionStatusLabel,
} from "@/lib/utils/format";

type RequisitionListProps = {
  rows: RequisitionListItem[];
};

export function RequisitionList({ rows }: RequisitionListProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-600">No requisitions yet.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy">
              {formatAmount(row.amount, row.currency)} · {row.department_name}
            </p>
            <p className="mt-1 text-sm text-gray-600">{row.purpose}</p>
            <p className="mt-1 text-xs text-gray-500">{formatDateTime(row.created_at)}</p>
            {row.decision_notes ? (
              <p className="mt-1 text-xs text-gray-500">Decision note: {row.decision_notes}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={row.status} label={requisitionStatusLabel(row.status)} />
            {row.status === "SUBMITTED" ? (
              <DeleteRecordButton
                title="Cancel requisition"
                message={`Cancel the ${formatAmount(row.amount, row.currency)} request for ${row.department_name}?`}
                confirmLabel="Cancel request"
                triggerLabel="Cancel"
                onConfirm={() => cancelMyRequisitionAction(row.id)}
              />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
