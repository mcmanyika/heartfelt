"use client";

import { useTransition } from "react";
import { setPaymentButtonActiveAction } from "@/lib/services/payment-button.actions";

export function PaymentButtonStatusButton({
  buttonId,
  active,
}: {
  buttonId: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await setPaymentButtonActiveAction(buttonId, !active);
        });
      }}
      className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-navy disabled:opacity-60"
    >
      {pending ? "Updating..." : active ? "Deactivate" : "Activate"}
    </button>
  );
}
