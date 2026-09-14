"use client";

import { useState, useTransition } from "react";
import { fieldClassName } from "@/components/ui/form-field";
import { roleLabel } from "@/lib/auth/permissions";
import { setUserRolesAction } from "@/lib/services/user.actions";
import type { StaffRoleAssignment } from "@/lib/services/user.service";
import { APP_ROLES, type AppRole } from "@/types";

type LocationOption = {
  id: string;
  name: string;
  code: string;
};

type DraftAssignment = {
  key: string;
  role: AppRole;
  location_id: string;
};

type UserRolesDialogProps = {
  userId: string;
  userName: string;
  assignments: StaffRoleAssignment[];
  locations: LocationOption[];
  lockSuperAdmin?: boolean;
};

function toDraft(assignments: StaffRoleAssignment[], fallbackLocationId: string): DraftAssignment[] {
  if (assignments.length === 0) {
    return [{ key: "new-0", role: "MEMBER", location_id: fallbackLocationId }];
  }

  return assignments.map((assignment, index) => ({
    key: `${assignment.role}-${assignment.locationId ?? "org"}-${index}`,
    role: assignment.role,
    location_id: assignment.locationId ?? fallbackLocationId,
  }));
}

export function UserRolesDialog({
  userId,
  userName,
  assignments,
  locations,
  lockSuperAdmin = false,
}: UserRolesDialogProps) {
  const fallbackLocationId = locations[0]?.id ?? "";
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftAssignment[]>(() => toDraft(assignments, fallbackLocationId));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateDraft(key: string, patch: Partial<DraftAssignment>) {
    setDrafts((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <>
      <button
        type="button"
        className="text-sm font-medium text-maroon hover:underline"
        onClick={() => {
          setError(null);
          setDrafts(toDraft(assignments, fallbackLocationId));
          setOpen(true);
        }}
      >
        Edit
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
            aria-labelledby={`roles-title-${userId}`}
            className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg"
          >
            <h2 id={`roles-title-${userId}`} className="text-lg font-semibold text-navy">
              Edit roles
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Assign campus roles for {userName}. Super Admin applies to the whole organization.
            </p>
            <div className="mt-4 space-y-3">
              {drafts.map((draft) => {
                const locked = lockSuperAdmin && draft.role === "SUPER_ADMIN";
                return (
                  <div key={draft.key} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <select
                      className={fieldClassName}
                      value={draft.role}
                      disabled={isPending || locked}
                      aria-label="Role"
                      onChange={(event) => {
                        const role = event.target.value as AppRole;
                        updateDraft(draft.key, {
                          role,
                          location_id: role === "SUPER_ADMIN" ? "" : draft.location_id || fallbackLocationId,
                        });
                      }}
                    >
                      {APP_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                    <select
                      className={fieldClassName}
                      value={draft.role === "SUPER_ADMIN" ? "" : draft.location_id}
                      disabled={isPending || draft.role === "SUPER_ADMIN"}
                      aria-label="Campus"
                      onChange={(event) => updateDraft(draft.key, { location_id: event.target.value })}
                    >
                      {draft.role === "SUPER_ADMIN" ? <option value="">Organization</option> : null}
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name} ({location.code})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-2 text-sm text-navy disabled:text-gray-400"
                      disabled={isPending || drafts.length === 1 || locked}
                      onClick={() => setDrafts((current) => current.filter((row) => row.key !== draft.key))}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-maroon hover:underline disabled:text-gray-400"
              disabled={isPending}
              onClick={() =>
                setDrafts((current) => [
                  ...current,
                  {
                    key: `new-${current.length}-${Date.now()}`,
                    role: "MEMBER",
                    location_id: fallbackLocationId,
                  },
                ])
              }
            >
              Add role
            </button>
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
                  setError(null);
                  startTransition(async () => {
                    const result = await setUserRolesAction({
                      user_id: userId,
                      assignments: drafts.map((draft) => ({
                        role: draft.role,
                        location_id: draft.role === "SUPER_ADMIN" ? "" : draft.location_id,
                      })),
                    });
                    if (result?.error) {
                      setError(result.error);
                      return;
                    }
                    setOpen(false);
                  });
                }}
              >
                {isPending ? "Saving..." : "Save roles"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
