"use client";

import { useState, useTransition } from "react";
import {
  cancelEventRegistrationAction,
  registerForEventAction,
} from "@/lib/services/portal.actions";
import { formatAmount } from "@/lib/utils/format";

type EventRegisterButtonProps = {
  eventId: string;
  registered: boolean;
  pendingPayment?: boolean;
  isPaid?: boolean;
  price?: number | null;
  currency?: string | null;
};

export function EventRegisterButton({
  eventId,
  registered,
  pendingPayment = false,
  isPaid = false,
  price = null,
  currency = null,
}: EventRegisterButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const payLabel =
    price != null && currency
      ? `Pay ${formatAmount(price, currency)} & register`
      : "Pay & register";

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        className="rounded-lg bg-maroon px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = registered
              ? await cancelEventRegistrationAction(eventId)
              : await registerForEventAction(eventId);
            if (result?.error) {
              setError(result.error);
            }
          });
        }}
      >
        {isPending
          ? "Working..."
          : registered
            ? "Cancel registration"
            : pendingPayment || isPaid
              ? pendingPayment
                ? "Complete payment"
                : payLabel
              : "Register"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
