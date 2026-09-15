"use client";

import { useState } from "react";
import { TransactionDetailDialog } from "@/components/admin/transaction-detail-dialog";
import { DataTable, DataTableBody } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { GivingTransactionListItem } from "@/lib/services/giving.service";
import { formatAmount, formatDateTime } from "@/lib/utils/format";
import { terminalPaymentDisplay } from "@/lib/validators/terminal.schema";

type TransactionsTableProps = {
  transactions: GivingTransactionListItem[];
  children: React.ReactNode;
};

export function TransactionsTable({ transactions, children }: TransactionsTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = transactions.find((row) => row.id === selectedId) ?? null;

  function openRow(row: GivingTransactionListItem) {
    setSelectedId(row.id);
  }

  return (
    <>
      <DataTable isEmpty={transactions.length === 0} emptyTitle="No transactions match these filters">
        {children}
        <DataTableBody>
          {transactions.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer text-navy hover:bg-background"
              tabIndex={0}
              aria-label={`View details for ${row.transaction_reference}`}
              onClick={() => openRow(row)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openRow(row);
                }
              }}
            >
              <td className="px-4 py-3 font-medium">{row.transaction_reference}</td>
              <td className="px-4 py-3">{row.member_name}</td>
              <td className="px-4 py-3">
                {row.location_name} ({row.location_code})
              </td>
              <td className="px-4 py-3">{row.category_name}</td>
              <td className="px-4 py-3">{formatAmount(row.amount, row.currency)}</td>
              <td className="px-4 py-3">{row.currency}</td>
              <td className="px-4 py-3">{terminalPaymentDisplay(row.payment_method, row.card_channel)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
            </tr>
          ))}
        </DataTableBody>
      </DataTable>
      {selected ? (
        <TransactionDetailDialog transaction={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </>
  );
}
