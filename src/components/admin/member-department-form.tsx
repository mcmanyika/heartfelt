"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import { addDepartmentMemberAction } from "@/lib/services/department.actions";
import type { AssignableDepartmentOption } from "@/lib/services/department.service";
import { departmentMemberSchema, type DepartmentMemberInput } from "@/lib/validators/department.schema";

type MemberDepartmentFormProps = {
  memberId: string;
  departments: AssignableDepartmentOption[];
  hasCurrentDepartments: boolean;
};

export function MemberDepartmentForm({
  memberId,
  departments,
  hasCurrentDepartments,
}: MemberDepartmentFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentMemberInput>({
    resolver: zodResolver(departmentMemberSchema),
    defaultValues: { department_id: "", member_id: memberId },
  });

  function onSubmit(values: DepartmentMemberInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await addDepartmentMemberAction(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      reset({ department_id: "", member_id: memberId });
    });
  }

  if (departments.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        {hasCurrentDepartments
          ? "No other active departments on this campus."
          : "No active departments on this campus."}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}

      <input type="hidden" {...register("member_id")} />

      <FormField
        label="Department"
        htmlFor="department_id"
        error={errors.department_id?.message}
        hint="Members can belong to several departments at once."
      >
        <select id="department_id" className={fieldClassName} disabled={isPending} {...register("department_id")}>
          <option value="">Select a department</option>
          {departments.map((department) => (
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
        {isPending ? "Adding..." : "Add to department"}
      </button>
    </form>
  );
}
