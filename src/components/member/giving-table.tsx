import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PortalGivingRow } from "@/lib/services/portal.service";
import { formatAmount, formatDateTime, paymentMethodLabel } from "@/lib/utils/format";

type GivingTableProps = {
  rows: PortalGivingRow[];
  compact?: boolean;
};

export function GivingTable({ rows, compact = false }: GivingTableProps) {
  return (
    <DataTable isEmpty={rows.length === 0} emptyTitle="No giving yet">
      <DataTableHead>
        <tr>
          <th className="px-4 py-3">Date</th>
          <th className="px-4 py-3">Category</th>
          <th className="px-4 py-3">Amount</th>
          {!compact ? <th className="px-4 py-3">Method</th> : null}
          <th className="px-4 py-3">Status</th>
          {!compact ? <th className="px-4 py-3">Reference</th> : null}
        </tr>
      </DataTableHead>
      <DataTableBody>
        {rows.map((row) => (
          <tr key={row.id} className="text-navy">
            <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
            <td className="px-4 py-3">{row.category_name}</td>
            <td className="px-4 py-3">{formatAmount(row.amount, row.currency)}</td>
            {!compact ? (
              <td className="px-4 py-3">
                {row.transaction_reference.startsWith("cs_")
                  ? "Stripe"
                  : paymentMethodLabel(row.payment_method)}
              </td>
            ) : null}
            <td className="px-4 py-3">
              <StatusBadge status={row.status} />
            </td>
            {!compact ? <td className="px-4 py-3">{row.transaction_reference}</td> : null}
          </tr>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
