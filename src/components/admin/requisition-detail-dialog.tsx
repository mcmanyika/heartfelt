"use client";

import { useEffect } from "react";
import { RequisitionDecisionActions } from "@/components/admin/requisition-decision-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RequisitionListItem } from "@/lib/services/requisition.service";
import {
  formatAmount,
  formatDateTime,
  requisitionStatusLabel,
} from "@/lib/utils/format";

type RequisitionDetailDialogProps = {
  requisition: RequisitionListItem;
  onClose: () => void;
};

export function RequisitionDetailDialog({ requisition, onClose }: RequisitionDetailDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const requester =
    requisition.membership_number && requisition.requester_name !== requisition.membership_number
      ? `${requisition.requester_name} · ${requisition.membership_number}`
      : requisition.requester_name;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-navy-deep/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`requisition-title-${requisition.id}`}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Requisition</p>
        <h2
          id={`requisition-title-${requisition.id}`}
          className="mt-1 text-2xl font-semibold text-navy"
        >
          {formatAmount(requisition.amount, requisition.currency)}
        </h2>
        <div className="mt-3">
          <StatusBadge
            status={requisition.status}
            label={requisitionStatusLabel(requisition.status)}
          />
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <DetailRow label="Requester" value={requester} />
          <DetailRow label="Department" value={requisition.department_name} />
          <DetailRow
            label="Campus"
            value={`${requisition.location_name} (${requisition.location_code})`}
          />
          <DetailRow label="Purpose" value={requisition.purpose} />
          {requisition.notes ? <DetailRow label="Notes" value={requisition.notes} /> : null}
          <DetailRow label="Submitted" value={formatDateTime(requisition.created_at)} />
          {requisition.decided_at ? (
            <DetailRow label="Decided" value={formatDateTime(requisition.decided_at)} />
          ) : null}
          {requisition.decision_notes ? (
            <DetailRow label="Decision notes" value={requisition.decision_notes} />
          ) : null}
        </dl>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {requisition.status === "SUBMITTED" ? (
            <RequisitionDecisionActions
              requisitionId={requisition.id}
              requesterName={requisition.requester_name}
              amountLabel={formatAmount(requisition.amount, requisition.currency)}
            />
          ) : null}
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border pt-3">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-navy whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
