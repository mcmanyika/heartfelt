"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import {
  createPaymentButtonAction,
  updatePaymentButtonAction,
} from "@/lib/services/payment-button.actions";
import { STRIPE_GIVING_CURRENCIES } from "@/lib/validators/member-giving.schema";
import {
  PAYMENT_BUTTON_AMOUNT_MODES,
  paymentButtonSchema,
  type PaymentButtonInput,
} from "@/lib/validators/payment-button.schema";

type Option = { id: string; name: string; code?: string };

type PaymentButtonFormProps = {
  buttonId?: string;
  lockLocation: boolean;
  locations: Option[];
  categories: Option[];
  defaultValues: PaymentButtonInput;
};

export function PaymentButtonForm({
  buttonId,
  lockLocation,
  locations,
  categories,
  defaultValues,
}: PaymentButtonFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PaymentButtonInput>({
    resolver: zodResolver(paymentButtonSchema),
    defaultValues,
  });
  const amountMode = useWatch({ control, name: "amount_mode" });
  const selectedLocation = locations.find((location) => location.id === defaultValues.location_id);

  function onSubmit(values: PaymentButtonInput) {
    setServerError(null);
    startTransition(async () => {
      const result = buttonId
        ? await updatePaymentButtonAction(buttonId, values)
        : await createPaymentButtonAction(values);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
      noValidate
    >
      {serverError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}

      <FormField
        label="Location"
        htmlFor="location_id"
        error={errors.location_id?.message}
        hint={lockLocation ? "Derived from your assigned campus." : undefined}
      >
        {lockLocation ? (
          <>
            <input type="hidden" {...register("location_id")} />
            <p className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-navy">
              {selectedLocation
                ? `${selectedLocation.name}${selectedLocation.code ? ` (${selectedLocation.code})` : ""}`
                : "Assigned location"}
            </p>
          </>
        ) : (
          <select id="location_id" className={fieldClassName} disabled={isPending} {...register("location_id")}>
            <option value="">Select a location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
                {location.code ? ` (${location.code})` : ""}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField label="Name" htmlFor="name" error={errors.name?.message} hint="Internal name for your team.">
        <input id="name" className={fieldClassName} disabled={isPending} {...register("name")} />
      </FormField>

      <FormField label="Button label" htmlFor="button_label" error={errors.button_label?.message}>
        <input id="button_label" className={fieldClassName} disabled={isPending} {...register("button_label")} />
      </FormField>

      <FormField label="Giving category" htmlFor="giving_category_id" error={errors.giving_category_id?.message}>
        <select
          id="giving_category_id"
          className={fieldClassName}
          disabled={isPending}
          {...register("giving_category_id")}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Amount mode" htmlFor="amount_mode" error={errors.amount_mode?.message}>
          <select id="amount_mode" className={fieldClassName} disabled={isPending} {...register("amount_mode")}>
            {PAYMENT_BUTTON_AMOUNT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode === "FIXED" ? "Fixed amount" : "Open amount"}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Currency" htmlFor="currency" error={errors.currency?.message}>
          <select id="currency" className={fieldClassName} disabled={isPending} {...register("currency")}>
            {STRIPE_GIVING_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {amountMode === "FIXED" ? (
        <FormField label="Amount" htmlFor="amount" error={errors.amount?.message}>
          <input
            id="amount"
            inputMode="decimal"
            className={fieldClassName}
            placeholder="0.00"
            disabled={isPending}
            {...register("amount")}
          />
        </FormField>
      ) : (
        <input type="hidden" {...register("amount")} />
      )}

      <FormField
        label="Success message"
        htmlFor="success_message"
        error={errors.success_message?.message}
        hint="Shown after a successful payment."
      >
        <textarea
          id="success_message"
          rows={3}
          className={fieldClassName}
          disabled={isPending}
          {...register("success_message")}
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-navy">
        <input type="checkbox" className="rounded border-border" disabled={isPending} {...register("active")} />
        Active and available on the public page
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Saving..." : buttonId ? "Save button" : "Create button"}
      </button>
    </form>
  );
}
