"use client";

import { useState, useTransition } from "react";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  triggerLabel: string;
  triggerClassName?: string;
  onConfirm: () => Promise<{ error?: string } | void>;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  triggerLabel,
  triggerClassName,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className={
          triggerClassName ??
          "text-sm font-medium text-maroon hover:underline"
        }
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {triggerLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-navy-deep/40"
            aria-label="Close dialog"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
          >
            <h2 id="confirm-title" className="text-lg font-semibold text-navy">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-2 text-sm text-navy"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-maroon px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await onConfirm();
                    if (result?.error) {
                      setError(result.error);
                      return;
                    }
                    setOpen(false);
                  });
                }}
              >
                {isPending ? "Working..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
