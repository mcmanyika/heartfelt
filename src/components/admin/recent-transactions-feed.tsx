"use client";

import Link from "next/link";
import { useState } from "react";
import { TransactionDetailDialog } from "@/components/admin/transaction-detail-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { GivingTransactionListItem } from "@/lib/services/giving.service";
import { formatAmount, formatDateTime } from "@/lib/utils/format";

type RecentTransactionsFeedProps = {
  transactions: GivingTransactionListItem[];
  empty: string;
  viewAllHref?: string;
};

export function RecentTransactionsFeed({
  transactions,
  empty,
  viewAllHref = "/admin/transactions",
}: RecentTransactionsFeedProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = transactions.find((row) => row.id === selectedId) ?? null;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-navy">Recent Transactions</h2>
          <Link href={viewAllHref} className="text-sm font-medium text-maroon hover:underline">
            View all
          </Link>
        </div>
        {transactions.length === 0 ? (
          <EmptyState title={empty} />
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {transactions.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="block w-full px-4 py-3 text-left hover:bg-background"
                  aria-label={`View details for ${formatAmount(row.amount, row.currency)}`}
                  onClick={() => setSelectedId(row.id)}
                >
                  <p className="text-sm font-medium text-navy">
                    {formatAmount(row.amount, row.currency)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {row.member_name} · {row.category_name}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateTime(row.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selected ? (
        <TransactionDetailDialog transaction={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </>
  );
}
