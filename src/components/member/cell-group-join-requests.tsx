"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  confirmCellGroupMembershipAction,
  declineCellGroupMembershipAction,
} from "@/lib/services/cell-group.actions";
import type { CellGroupJoinRequest } from "@/lib/services/cell-group.service";
import { formatDate } from "@/lib/utils/format";

type CellGroupJoinRequestsProps = {
  requests: CellGroupJoinRequest[];
};

export function CellGroupJoinRequests({ requests }: CellGroupJoinRequestsProps) {
  if (requests.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-navy">Join requests</h2>
      <p className="mt-1 text-sm text-gray-600">
        Confirm members who asked to join cell groups you lead.
      </p>
      <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
        {requests.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-navy">{request.member_name}</p>
              <p className="text-xs text-gray-500">
                {request.cell_group_name} · {request.membership_number} ·{" "}
                {formatDate(request.joined_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ConfirmDialog
                title="Confirm membership"
                message={`Confirm ${request.member_name} for ${request.cell_group_name}.`}
                confirmLabel="Confirm"
                triggerLabel="Confirm"
                onConfirm={() => confirmCellGroupMembershipAction(request.id)}
              />
              <ConfirmDialog
                title="Decline request"
                message={`Decline ${request.member_name}'s request for ${request.cell_group_name}.`}
                confirmLabel="Decline"
                triggerLabel="Decline"
                onConfirm={() => declineCellGroupMembershipAction(request.id)}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
