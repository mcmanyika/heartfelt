"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";

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
  const titleId = "confirm-title";

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
        <Modal
          onClose={() => setOpen(false)}
          labelledBy={titleId}
          className="max-w-md p-6"
          zClassName="z-[70]"
        >
          <h2 id={titleId} className="text-lg font-semibold text-navy">
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
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-navy hover:bg-background"
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
        </Modal>
      ) : null}
    </>
  );
}
