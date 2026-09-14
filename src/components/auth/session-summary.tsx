import { roleLabel } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/types";

type SessionSummaryProps = {
  user: CurrentUser;
};

export function SessionSummary({ user }: SessionSummaryProps) {
  const locationLabel = user.isSuperAdmin
    ? "All locations"
    : user.accessibleLocations
        .filter((location) => user.staffLocationIds.includes(location.id) || location.id === user.primaryLocationId)
        .map((location) => `${location.name} (${location.code})`)
        .join(", ") || "No assigned location";

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-background px-4 py-3">
        <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
          Signed in as
        </dt>
        <dd className="mt-1 text-sm text-navy">
          {user.profile.first_name} {user.profile.last_name}
        </dd>
        <dd className="text-sm text-gray-600">{user.email}</dd>
      </div>
      <div className="rounded-xl border border-border bg-background px-4 py-3">
        <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
          Role
        </dt>
        <dd className="mt-1 text-sm text-navy">
          {user.primaryRole ? roleLabel(user.primaryRole) : "Unassigned"}
        </dd>
        {user.roleNames.length > 1 ? (
          <dd className="text-sm text-gray-600">
            {user.roleNames.map(roleLabel).join(", ")}
          </dd>
        ) : null}
      </div>
      <div className="rounded-xl border border-border bg-background px-4 py-3 sm:col-span-2">
        <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
          Location access
        </dt>
        <dd className="mt-1 text-sm text-navy">{locationLabel}</dd>
      </div>
    </dl>
  );
}
