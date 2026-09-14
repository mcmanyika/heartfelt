"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type DeleteRecordButtonProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  triggerLabel?: string;
  onConfirm: () => Promise<{ error?: string } | void>;
};

export function DeleteRecordButton({
  title,
  message,
  confirmLabel = "Delete",
  triggerLabel = "Delete",
  onConfirm,
}: DeleteRecordButtonProps) {
  return (
    <ConfirmDialog
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      triggerLabel={triggerLabel}
      triggerClassName="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700"
      onConfirm={onConfirm}
    />
  );
}
