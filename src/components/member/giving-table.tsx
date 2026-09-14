import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PortalGivingRow } from "@/lib/services/portal.service";
import { formatAmount, formatDateTime, paymentMethodLabel } from "@/lib/utils/format";

type GivingTableProps = {
  rows: PortalGivingRow[];
};

export function GivingTable({ rows }: GivingTableProps) {
  return (
    <DataTable isEmpty={rows.length === 0} emptyTitle="No giving history yet">
      <DataTableHead>
        <tr>
          <th className="px-4 py-3">Date</th>
          <th className="px-4 py-3">Category</th>
          <th className="px-4 py-3">Amount</th>
          <th className="px-4 py-3">Currency</th>
          <th className="px-4 py-3">Payment method</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Reference</th>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {rows.map((row) => (
          <tr key={row.id} className="text-navy">
            <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
            <td className="px-4 py-3">{row.category_name}</td>
            <td className="px-4 py-3">{formatAmount(row.amount, row.currency)}</td>
            <td className="px-4 py-3">{row.currency}</td>
            <td className="px-4 py-3">{paymentMethodLabel(row.payment_method)}</td>
            <td className="px-4 py-3">
              <StatusBadge status={row.status} />
            </td>
            <td className="px-4 py-3">{row.transaction_reference}</td>
          </tr>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
