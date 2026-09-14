"use client";

import { useState, useTransition } from "react";
import {
  cancelEventRegistrationAction,
  registerForEventAction,
} from "@/lib/services/portal.actions";

type EventRegisterButtonProps = {
  eventId: string;
  registered: boolean;
};

export function EventRegisterButton({ eventId, registered }: EventRegisterButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        {isPending ? "Working..." : registered ? "Cancel registration" : "Register"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
