"use client";

import { useEffect } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import type { GivingTransactionListItem } from "@/lib/services/giving.service";
import { formatAmount, formatDateTime } from "@/lib/utils/format";
import { terminalPaymentDisplay } from "@/lib/validators/terminal.schema";

type TransactionDetailDialogProps = {
  transaction: GivingTransactionListItem;
  onClose: () => void;
};

export function TransactionDetailDialog({ transaction, onClose }: TransactionDetailDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const method = terminalPaymentDisplay(transaction.payment_method, transaction.card_channel);
  const member =
    transaction.membership_number && transaction.member_name !== transaction.membership_number
      ? `${transaction.member_name} · ${transaction.membership_number}`
      : transaction.member_name;
  const terminal =
    transaction.terminal_code && transaction.terminal_name
      ? `${transaction.terminal_code} · ${transaction.terminal_name}`
      : transaction.terminal_code;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-navy-deep/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`transaction-title-${transaction.id}`}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Transaction</p>
        <h2 id={`transaction-title-${transaction.id}`} className="mt-1 text-2xl font-semibold text-navy">
          {formatAmount(transaction.amount, transaction.currency)}
        </h2>
        <div className="mt-3">
          <StatusBadge status={transaction.status} />
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <DetailRow label="Reference" value={transaction.transaction_reference} mono />
          <DetailRow label="Member" value={member} />
          <DetailRow label="Location" value={`${transaction.location_name} (${transaction.location_code})`} />
          <DetailRow label="Category" value={transaction.category_name} />
          <DetailRow label="Payment method" value={method} />
          {transaction.receipt_code ? (
            <DetailRow label="Receipt code" value={transaction.receipt_code} mono />
          ) : null}
          {transaction.gift_note ? <DetailRow label="Note" value={transaction.gift_note} /> : null}
          {terminal ? <DetailRow label="Terminal" value={terminal} /> : null}
          <DetailRow
            label="Source"
            value={transaction.simulated ? "Payment terminal" : transaction.terminal_code ? "Terminal" : "Manual entry"}
          />
          <DetailRow label="Date" value={formatDateTime(transaction.created_at)} />
        </dl>

        <div className="mt-6 flex justify-end">
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

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border pt-3">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className={`text-right text-navy ${mono ? "break-all font-mono text-xs" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
