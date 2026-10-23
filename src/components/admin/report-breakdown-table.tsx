"use client";

import { useEffect, useMemo, useState } from "react";
import { TransactionDetailDialog } from "@/components/admin/transaction-detail-dialog";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { GivingTransactionListItem } from "@/lib/services/giving.service";
import {
  formatAmount,
  formatDateTime,
  formatTotals,
  formatTotalsRecord,
  formatTransactionReference,
  paymentMethodLabel,
} from "@/lib/utils/format";
import { terminalPaymentDisplay } from "@/lib/validators/terminal.schema";

type CategoryBucket = {
  name: string;
  count: number;
  totals: Record<string, number>;
};

type MethodBucket = {
  label: string;
  count: number;
  totals: Record<string, number>;
};

type ReportBreakdownTableProps =
  | {
      kind: "category";
      title: string;
      empty: string;
      buckets: CategoryBucket[];
      transactions: GivingTransactionListItem[];
    }
  | {
      kind: "method";
      title: string;
      empty: string;
      buckets: MethodBucket[];
      transactions: GivingTransactionListItem[];
    };

type OpenBucket = {
  key: string;
  title: string;
};

export function ReportBreakdownTable(props: ReportBreakdownTableProps) {
  const [bucket, setBucket] = useState<OpenBucket | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!bucket) {
      return [] as GivingTransactionListItem[];
    }
    if (props.kind === "category") {
      return props.transactions.filter((row) => row.category_name === bucket.key);
    }
    return props.transactions.filter((row) => row.payment_method === bucket.key);
  }, [bucket, props]);

  const selected = filtered.find((row) => row.id === selectedId) ?? null;

  useEffect(() => {
    if (!bucket) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !selectedId) {
        setBucket(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bucket, selectedId]);

  function openBucket(key: string, title: string) {
    setSelectedId(null);
    setBucket({ key, title });
  }

  return (
    <>
      <section className="min-w-0">
        <h2 className="mb-3 text-sm font-semibold text-navy">{props.title}</h2>
        <DataTable isEmpty={props.buckets.length === 0} emptyTitle={props.empty}>
          <DataTableHead>
            <tr>
              <th className="px-4 py-3">{props.kind === "category" ? "Category" : "Method"}</th>
              <th className="px-4 py-3">Gifts</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {props.kind === "category"
              ? props.buckets.map((row) => (
                  <tr
                    key={row.name}
                    className="cursor-pointer text-navy hover:bg-background"
                    tabIndex={0}
                    aria-label={`View ${row.name} transactions`}
                    onClick={() => openBucket(row.name, row.name)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openBucket(row.name, row.name);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.count}</td>
                    <td className="px-4 py-3">
                      {formatTotals(
                        Object.entries(row.totals).map(([currency, amount]) => ({
                          currency,
                          amount,
                        })),
                      )}
                    </td>
                  </tr>
                ))
              : props.buckets.map((row) => (
                  <tr
                    key={row.label}
                    className="cursor-pointer text-navy hover:bg-background"
                    tabIndex={0}
                    aria-label={`View ${paymentMethodLabel(row.label)} transactions`}
                    onClick={() => openBucket(row.label, paymentMethodLabel(row.label))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openBucket(row.label, paymentMethodLabel(row.label));
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-medium">{paymentMethodLabel(row.label)}</td>
                    <td className="px-4 py-3">{row.count}</td>
                    <td className="px-4 py-3">{formatTotalsRecord(row.totals)}</td>
                  </tr>
                ))}
          </DataTableBody>
        </DataTable>
      </section>

      {bucket ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-navy-deep/40"
            aria-label="Close dialog"
            onClick={() => setBucket(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-transactions-title"
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
          >
            <div className="border-b border-border px-6 py-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                {props.kind === "category" ? "Category" : "Payment method"}
              </p>
              <h2 id="report-transactions-title" className="mt-1 text-lg font-semibold text-navy">
                {bucket.title}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {filtered.length} gift{filtered.length === 1 ? "" : "s"} · click a row for details
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-600">No transactions in this group.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-card text-xs tracking-wide text-gray-500 uppercase">
                    <tr className="border-b border-border">
                      <th className="px-6 py-3 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">
                        {props.kind === "category" ? "Method" : "Category"}
                      </th>
                      <th className="px-6 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer text-navy hover:bg-background"
                        tabIndex={0}
                        aria-label={`View details for ${row.transaction_reference || row.id}`}
                        onClick={() => setSelectedId(row.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedId(row.id);
                          }
                        }}
                      >
                        <td className="px-6 py-3">
                          <p className="font-medium">{row.member_name}</p>
                          <p
                            className="font-mono text-xs text-gray-500"
                            title={row.transaction_reference || undefined}
                          >
                            {formatTransactionReference(row.transaction_reference)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{formatAmount(row.amount, row.currency)}</p>
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3">
                          {props.kind === "category"
                            ? terminalPaymentDisplay(row.payment_method, row.card_channel)
                            : row.category_name}
                        </td>
                        <td className="px-6 py-3">{formatDateTime(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end border-t border-border px-6 py-4">
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy"
                onClick={() => setBucket(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selected ? (
        <TransactionDetailDialog transaction={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </>
  );
}
