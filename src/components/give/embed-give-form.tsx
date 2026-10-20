"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import { startEmbedGivingCheckoutAction } from "@/lib/services/payment-button.actions";
import { formatAmount } from "@/lib/utils/format";
import { z } from "zod";

const openAmountSchema = z.object({
  amount: z
    .string()
    .trim()
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0, "Enter a valid amount."),
});

type EmbedGiveFormProps = {
  token: string;
  buttonLabel: string;
  amountMode: "FIXED" | "OPEN";
  amount: number | null;
  currency: string;
  configured: boolean;
};

export function EmbedGiveForm({
  token,
  buttonLabel,
  amountMode,
  amount,
  currency,
  configured,
}: EmbedGiveFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ amount: string }>({
    resolver: amountMode === "OPEN" ? zodResolver(openAmountSchema) : undefined,
    defaultValues: { amount: amountMode === "FIXED" && amount !== null ? String(amount) : "" },
  });

  if (!configured) {
    return <p className="text-sm text-gray-600">Online giving is not available yet.</p>;
  }

  function onSubmit(values: { amount: string }) {
    setServerError(null);
    startTransition(async () => {
      const result = await startEmbedGivingCheckoutAction({
        token,
        amount: amountMode === "FIXED" ? String(amount ?? "") : values.amount,
      });
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {amountMode === "FIXED" && amount !== null ? (
        <p className="text-2xl font-semibold text-navy">{formatAmount(amount, currency)}</p>
      ) : (
        <FormField label="Amount" htmlFor="amount" error={errors.amount?.message}>
          <div className="flex gap-2">
            <span className="inline-flex items-center rounded-lg border border-border bg-background px-3 text-sm text-navy">
              {currency}
            </span>
            <input
              id="amount"
              inputMode="decimal"
              className={fieldClassName}
              placeholder="0.00"
              {...register("amount")}
            />
          </div>
        </FormField>
      )}
      {serverError ? (
        <p role="alert" className="text-sm text-red-700">
          {serverError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-maroon px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Opening Stripe..." : buttonLabel}
      </button>
    </form>
  );
}
