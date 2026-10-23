"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import { submitRequisitionAction } from "@/lib/services/requisition.actions";
import type { LedDepartmentOption } from "@/lib/services/requisition.service";
import {
  requisitionSchema,
  type RequisitionInput,
} from "@/lib/validators/requisition.schema";
import { MVP_CURRENCIES } from "@/types";

type RequisitionFormProps = {
  departments: LedDepartmentOption[];
};

export function RequisitionForm({ departments }: RequisitionFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequisitionInput>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      department_id: departments[0]?.id ?? "",
      amount: "",
      currency: "USD",
      purpose: "",
      notes: "",
    },
  });

  function onSubmit(values: RequisitionInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await submitRequisitionAction(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      reset({
        department_id: values.department_id,
        amount: "",
        currency: values.currency,
        purpose: "",
        notes: "",
      });
    });
  }

  if (departments.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        You must be assigned as a department head before you can submit a requisition.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
          disabled={isPending}
          {...register("department_id")}
        >
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
              {department.code ? ` · ${department.code}` : ""}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Amount" htmlFor="amount" error={errors.amount?.message}>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            className={fieldClassName}
            disabled={isPending}
            placeholder="0.00"
            {...register("amount")}
          />
        </FormField>
        <FormField label="Currency" htmlFor="currency" error={errors.currency?.message}>
          <select
            id="currency"
            className={fieldClassName}
            disabled={isPending}
            {...register("currency")}
          >
            {MVP_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Purpose" htmlFor="purpose" error={errors.purpose?.message}>
        <textarea
          id="purpose"
          rows={3}
          className={fieldClassName}
          disabled={isPending}
          placeholder="What are the funds for?"
          {...register("purpose")}
        />
      </FormField>

      <FormField
        label="Notes"
        htmlFor="notes"
        error={errors.notes?.message}
        hint="Optional context for campus finance."
      >
        <textarea
          id="notes"
          rows={2}
          className={fieldClassName}
          disabled={isPending}
          {...register("notes")}
        />
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Submitting..." : "Submit requisition"}
      </button>
    </form>
  );
}
