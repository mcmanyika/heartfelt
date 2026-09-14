"use client";

import { useState, useTransition } from "react";
import { fieldClassName } from "@/components/ui/form-field";
import { setProfileStatusAction } from "@/lib/services/user.actions";
import { PROFILE_STATUSES } from "@/types";
import { profileStatusLabel } from "@/lib/utils/format";

type ProfileStatusSelectProps = {
  userId: string;
  status: string;
  disabled?: boolean;
};

export function ProfileStatusSelect({ userId, status, disabled }: ProfileStatusSelectProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="min-w-36">
      <select
        className={fieldClassName}
        defaultValue={status}
        disabled={disabled || isPending}
        aria-label="Account status"
        onChange={(event) => {
          const next = event.target.value;
          setError(null);
          startTransition(async () => {
            const result = await setProfileStatusAction(userId, next);
            if (result?.error) {
              setError(result.error);
              event.target.value = status;
            }
          });
        }}
      >
        {PROFILE_STATUSES.map((value) => (
          <option key={value} value={value}>
            {profileStatusLabel(value)}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
