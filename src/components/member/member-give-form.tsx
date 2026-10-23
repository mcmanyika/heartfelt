"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import { startMemberGivingCheckoutAction } from "@/lib/services/member-giving.actions";
import {
  memberGivingCheckoutSchema,
  STRIPE_GIVING_CURRENCIES,
  type MemberGivingCheckoutInput,
} from "@/lib/validators/member-giving.schema";

type MemberGiveFormProps = {
  categories: Array<{ id: string; name: string }>;
  configured: boolean;
  canGive: boolean;
};

export function MemberGiveForm({ categories, configured, canGive }: MemberGiveFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberGivingCheckoutInput>({
    resolver: zodResolver(memberGivingCheckoutSchema),
    defaultValues: {
      giving_category_id: categories[0]?.id ?? "",
      amount: "",
      currency: "USD",
    },
  });

  if (!canGive) {
    return <p className="text-sm text-gray-600">Link your membership to give online.</p>;
  }

  if (!configured) {
    return <p className="text-sm text-gray-600">Online giving unavailable.</p>;
  }

  if (categories.length === 0) {
    return <p className="text-sm text-gray-600">No giving categories yet.</p>;
  }

  function onSubmit(values: MemberGivingCheckoutInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await startMemberGivingCheckoutAction(values);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-4">
      <FormField label="Category" htmlFor="giving_category_id" error={errors.giving_category_id?.message}>
        <select id="giving_category_id" className={fieldClassName} {...register("giving_category_id")}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Amount" htmlFor="amount" error={errors.amount?.message}>
        <input id="amount" inputMode="decimal" className={fieldClassName} placeholder="0.00" {...register("amount")} />
      </FormField>
      <FormField label="Currency" htmlFor="currency" error={errors.currency?.message}>
        <select id="currency" className={fieldClassName} {...register("currency")}>
          {STRIPE_GIVING_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </FormField>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Opening…" : "Give"}
        </button>
      </div>
      {serverError ? (
        <p role="alert" className="text-sm text-red-700 md:col-span-4">
          {serverError}
        </p>
      ) : null}
    </form>
  );
}
