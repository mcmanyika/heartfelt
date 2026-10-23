"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  joinMyCellGroupAction,
  leaveMyCellGroupAction,
} from "@/lib/services/cell-group.actions";
import type {
  AssignableCellGroupOption,
  PortalCellGroup,
} from "@/lib/services/cell-group.service";
import {
  cellGroupMemberRoleLabel,
  cellGroupMembershipStatusLabel,
  formatCellGroupMeeting,
} from "@/lib/utils/format";
import { myCellGroupSchema, type MyCellGroupInput } from "@/lib/validators/profile.schema";

type MemberCellGroupEditorProps = {
  current: PortalCellGroup | null;
  available: AssignableCellGroupOption[];
};

export function MemberCellGroupEditor({ current, available }: MemberCellGroupEditorProps) {
  const remaining = available.filter((group) => group.id !== current?.id);
  const canRequest = !current;
  const [requestOpen, setRequestOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MyCellGroupInput>({
    resolver: zodResolver(myCellGroupSchema),
    defaultValues: { cell_group_id: "" },
  });

  function closeRequest() {
    setRequestOpen(false);
    setServerError(null);
    reset({ cell_group_id: "" });
  }

  function onSubmit(values: MyCellGroupInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await joinMyCellGroupAction(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      closeRequest();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {!current
            ? "You have not joined a cell group yet."
            : current.status === "PENDING"
              ? "Your join request is waiting for confirmation."
              : "You can only belong to one cell group at a time."}
        </p>
        <button
          type="button"
          onClick={() => setRequestOpen(true)}
          disabled={!canRequest || remaining.length === 0}
          title={
            !canRequest
              ? current?.status === "PENDING"
                ? "Cancel your pending request before requesting another group."
                : "Leave your current cell group before requesting another."
              : remaining.length === 0
                ? "No active cell groups on this campus yet."
                : undefined
          }
          className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Request to join
        </button>
      </div>

      {current ? (
        <ul className="divide-y divide-border rounded-xl border border-border">
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-navy">{current.name}</p>
              <p className="text-xs text-gray-500">
                {formatCellGroupMeeting(current.meeting_weekday, current.meeting_time)}
                {current.leader_name ? ` · Leader: ${current.leader_name}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={current.status}
                label={cellGroupMembershipStatusLabel(current.status)}
              />
              {current.status === "ACTIVE" ? (
                <StatusBadge status={current.role} label={cellGroupMemberRoleLabel(current.role)} />
              ) : null}
              <DeleteRecordButton
                title={current.status === "PENDING" ? "Cancel request" : "Leave this cell group"}
                message={
                  current.status === "PENDING"
                    ? `Cancel your request to join ${current.name}.`
                    : `You will leave ${current.name}. You can request another group later.`
                }
                confirmLabel={current.status === "PENDING" ? "Cancel request" : "Leave"}
                triggerLabel={current.status === "PENDING" ? "Cancel" : "Leave"}
                onConfirm={() => leaveMyCellGroupAction(current.id)}
              />
            </div>
          </li>
        </ul>
      ) : null}

      {canRequest && remaining.length === 0 ? (
        <p className="text-sm text-gray-600">No active cell groups on this campus yet.</p>
      ) : null}

      {requestOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close dialog"
            onClick={closeRequest}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-cell-group-title"
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <h2 id="request-cell-group-title" className="text-lg font-semibold text-navy">
              Request to join
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              A cell group leader or campus admin must confirm your request. You can only belong to
              one cell group at a time.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
              {serverError ? (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                >
                  {serverError}
                </p>
              ) : null}
              <FormField label="Cell group" htmlFor="cell_group_id" error={errors.cell_group_id?.message}>
                <select
                  id="cell_group_id"
                  className={fieldClassName}
                  disabled={isPending || remaining.length === 0}
                  {...register("cell_group_id")}
                >
                  <option value="">Select a cell group</option>
                  {remaining.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                      {group.code ? ` · ${group.code}` : ""}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeRequest}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || remaining.length === 0}
                  className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {isPending ? "Sending..." : "Send request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
