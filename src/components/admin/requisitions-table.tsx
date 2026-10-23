"use client";

import { useState } from "react";
import { RequisitionDecisionActions } from "@/components/admin/requisition-decision-actions";
import { RequisitionDetailDialog } from "@/components/admin/requisition-detail-dialog";
import { DataTable, DataTableBody } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RequisitionListItem } from "@/lib/services/requisition.service";
import {
  formatAmount,
  formatDateTime,
  requisitionStatusLabel,
} from "@/lib/utils/format";

type RequisitionsTableProps = {
  rows: RequisitionListItem[];
  children: React.ReactNode;
};

export function RequisitionsTable({ rows, children }: RequisitionsTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  function openRow(row: RequisitionListItem) {
    setSelectedId(row.id);
  }

  return (
    <>
      <DataTable isEmpty={rows.length === 0} emptyTitle="No requisitions match these filters">
        {children}
        <DataTableBody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer text-navy hover:bg-background"
              tabIndex={0}
              aria-label={`View details for ${formatAmount(row.amount, row.currency)} from ${row.requester_name}`}
              onClick={() => openRow(row)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openRow(row);
                }
              }}
            >
              <td className="px-4 py-3">
                <p className="font-medium">{row.requester_name}</p>
                <p className="text-xs text-gray-500">{row.membership_number}</p>
              </td>
              <td className="px-4 py-3">
                <p>{row.department_name}</p>
                <p className="text-xs text-gray-500">
                  {row.location_name} ({row.location_code})
                </p>
              </td>
              <td className="px-4 py-3 font-medium">
                {formatAmount(row.amount, row.currency)}
              </td>
              <td className="max-w-xs px-4 py-3">
                <p className="line-clamp-2 text-sm">{row.purpose}</p>
              </td>
              <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} label={requisitionStatusLabel(row.status)} />
              </td>
              <td
                className="px-4 py-3"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {row.status === "SUBMITTED" ? (
                  <RequisitionDecisionActions
                    requisitionId={row.id}
                    requesterName={row.requester_name}
                    amountLabel={formatAmount(row.amount, row.currency)}
                  />
                ) : (
                  <span className="text-xs text-gray-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </DataTableBody>
      </DataTable>
      {selected ? (
        <RequisitionDetailDialog requisition={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </>
  );
}
