"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  joinMyDepartmentAction,
  leaveMyDepartmentAction,
} from "@/lib/services/department.actions";
import type { AssignableDepartmentOption, PortalDepartment } from "@/lib/services/department.service";
import {
  departmentMemberRoleLabel,
  departmentMembershipStatusLabel,
} from "@/lib/utils/format";
import { myDepartmentSchema, type MyDepartmentInput } from "@/lib/validators/profile.schema";

type MemberDepartmentsEditorProps = {
  current: PortalDepartment[];
  available: AssignableDepartmentOption[];
};

export function MemberDepartmentsEditor({ current, available }: MemberDepartmentsEditorProps) {
  const remaining = available.filter(
    (department) => !current.some((joined) => joined.id === department.id),
  );
  const [requestOpen, setRequestOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MyDepartmentInput>({
    resolver: zodResolver(myDepartmentSchema),
    defaultValues: { department_id: "" },
  });

  function closeRequest() {
    setRequestOpen(false);
    setServerError(null);
    reset({ department_id: "" });
  }

  function onSubmit(values: MyDepartmentInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await joinMyDepartmentAction(values);
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
          {current.length === 0
            ? "You have not joined a department yet."
            : `${current.length} department${current.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          onClick={() => setRequestOpen(true)}
          disabled={remaining.length === 0}
          title={
            remaining.length === 0
              ? available.length === 0
                ? "No active departments on this campus yet."
                : "You already requested or joined every campus department."
              : undefined
          }
          className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Request to join
        </button>
      </div>

      {current.length > 0 ? (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {current.map((department) => (
            <li key={department.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-navy">{department.name}</p>
                <p className="text-xs text-gray-500">
                  {department.venue || "Venue not set"}
                  {department.leader_name ? ` · Leader: ${department.leader_name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={department.status}
                  label={departmentMembershipStatusLabel(department.status)}
                />
                {department.status === "ACTIVE" ? (
                  <StatusBadge status={department.role} label={departmentMemberRoleLabel(department.role)} />
                ) : null}
                <DeleteRecordButton
                  title={department.status === "PENDING" ? "Cancel request" : "Leave this department"}
                  message={
                    department.status === "PENDING"
                      ? `Cancel your request to join ${department.name}.`
                      : `You will leave ${department.name}. You can request again later.`
                  }
                  confirmLabel={department.status === "PENDING" ? "Cancel request" : "Leave"}
                  triggerLabel={department.status === "PENDING" ? "Cancel" : "Leave"}
                  onConfirm={() => leaveMyDepartmentAction(department.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {remaining.length === 0 ? (
        <p className="text-sm text-gray-600">
          {available.length === 0
            ? "No active departments on this campus yet."
            : "You already requested or joined every campus department."}
        </p>
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
            aria-labelledby="request-department-title"
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <h2 id="request-department-title" className="text-lg font-semibold text-navy">
              Request to join
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              A department leader or campus admin must confirm your request.
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
              <FormField label="Department" htmlFor="department_id" error={errors.department_id?.message}>
                <select
                  id="department_id"
                  className={fieldClassName}
                  disabled={isPending || remaining.length === 0}
                  {...register("department_id")}
                >
                  <option value="">Select a department</option>
                  {remaining.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                      {department.code ? ` · ${department.code}` : ""}
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
