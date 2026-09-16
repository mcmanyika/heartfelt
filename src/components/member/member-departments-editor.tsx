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
import { departmentMemberRoleLabel } from "@/lib/utils/format";
import { myDepartmentSchema, type MyDepartmentInput } from "@/lib/validators/profile.schema";

type MemberDepartmentsEditorProps = {
  current: PortalDepartment[];
  available: AssignableDepartmentOption[];
};

export function MemberDepartmentsEditor({ current, available }: MemberDepartmentsEditorProps) {
  const remaining = available.filter(
    (department) => !current.some((joined) => joined.id === department.id),
  );
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

  function onSubmit(values: MyDepartmentInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await joinMyDepartmentAction(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      reset({ department_id: "" });
    });
  }

  return (
    <div className="space-y-5">
      {current.length === 0 ? (
        <p className="text-sm text-gray-600">You have not joined a department yet.</p>
      ) : (
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
                <StatusBadge status={department.role} label={departmentMemberRoleLabel(department.role)} />
                <DeleteRecordButton
                  title="Leave this department"
                  message={`You will leave ${department.name}. You can join again later.`}
                  confirmLabel="Leave"
                  triggerLabel="Leave"
                  onConfirm={() => leaveMyDepartmentAction(department.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {remaining.length === 0 ? (
        <p className="text-sm text-gray-600">
          {current.length > 0
            ? "No other active departments on this campus."
            : "No active departments on this campus."}
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {serverError}
            </p>
          ) : null}
          <FormField label="Join a department" htmlFor="department_id" error={errors.department_id?.message}>
            <select
              id="department_id"
              className={fieldClassName}
              disabled={isPending}
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
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isPending ? "Joining..." : "Join department"}
          </button>
        </form>
      )}
    </div>
  );
}
