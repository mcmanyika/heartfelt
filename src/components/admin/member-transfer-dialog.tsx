"use client";

import { useState, useTransition } from "react";
import { fieldClassName } from "@/components/ui/form-field";
import { transferMemberAction } from "@/lib/services/member.actions";

type LocationOption = {
  id: string;
  name: string;
  code: string;
};

type MemberTransferDialogProps = {
  memberId: string;
  memberName: string;
  destinations: LocationOption[];
};

export function MemberTransferDialog({
  memberId,
  memberName,
  destinations,
}: MemberTransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [toLocationId, setToLocationId] = useState(destinations[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (destinations.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="text-sm font-medium text-maroon hover:underline"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Transfer
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
            aria-labelledby="transfer-title"
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
          >
            <h2 id="transfer-title" className="text-lg font-semibold text-navy">
              Transfer member
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Move {memberName} to another campus. The membership number stays
              the same.
            </p>
            <label className="mt-4 block text-sm font-medium text-navy" htmlFor="to_location_id">
              Destination
            </label>
            <select
              id="to_location_id"
              className={`${fieldClassName} mt-1.5`}
              value={toLocationId}
              onChange={(event) => setToLocationId(event.target.value)}
              disabled={isPending}
            >
              {destinations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.code})
                </option>
              ))}
            </select>
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
                disabled={isPending || !toLocationId}
                onClick={() => {
                  startTransition(async () => {
                    const result = await transferMemberAction({
                      member_id: memberId,
                      to_location_id: toLocationId,
                    });
                    if (result?.error) {
                      setError(result.error);
                      return;
                    }
                    setOpen(false);
                  });
                }}
              >
                {isPending ? "Transferring..." : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
