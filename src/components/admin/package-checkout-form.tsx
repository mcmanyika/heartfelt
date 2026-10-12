"use client";

import { useActionState } from "react";
import { startPackageCheckoutAction } from "@/lib/services/billing.actions";
import type { BillingCheckoutQuote } from "@/lib/billing/plans";
import { formatAmount } from "@/lib/utils/format";

export function PackageCheckoutForm({
  quotes,
  configured,
}: {
  quotes: BillingCheckoutQuote[];
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(startPackageCheckoutAction, null);

  if (!configured) {
    return (
      <p className="text-sm text-gray-600">
        Stripe is not configured yet. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET on the server, then pay from here.
      </p>
    );
  }

  if (quotes.length === 0) {
    return null;
  }

  return (
    <form action={action} className="mt-4 space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-navy">Choose a package</legend>
        {quotes.map((quote, index) => (
          <label key={quote.plan} className="flex items-start gap-3 rounded-xl border border-border px-3 py-2 text-sm">
            <input
              type="radio"
              name="plan"
              value={quote.plan}
              defaultChecked={index === quotes.length - 1}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-navy">{quote.label}</span>
              <span className="mt-0.5 block text-gray-600">
                {formatAmount(quote.totalCents / 100, "USD")} · {quote.detail}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {state?.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-navy px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Opening Stripe…" : "Pay with Stripe"}
      </button>
    </form>
  );
}
