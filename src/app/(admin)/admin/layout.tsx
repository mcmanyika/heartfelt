import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { ADMIN_NAV_ITEMS } from "@/lib/auth/admin-nav";
import { hasAnyRole, roleLabel } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await requireRole(STAFF_ROLES);
  const selection = await getAdminLocationSelection(current);
  const navItems = ADMIN_NAV_ITEMS.filter((item) => hasAnyRole(current, item.roles));
  const locationLabel = selection.location
    ? `${selection.location.name} (${selection.location.code})`
    : current.isSuperAdmin
      ? "All locations"
      : "No assigned location";

  return (
    <AdminShell
      user={{
        firstName: current.profile.first_name,
        lastName: current.profile.last_name,
        roleLabel: current.primaryRole ? roleLabel(current.primaryRole) : "Staff",
        locationLabel,
      }}
      navItems={[...navItems]}
      locationLocked={selection.locked}
      selectedLocationId={selection.locationId}
      selectedLocationLabel={locationLabel}
      locations={current.accessibleLocations.map((location) => ({
        id: location.id,
        name: location.name,
        code: location.code,
      }))}
    >
      {children}
    </AdminShell>
  );
}
