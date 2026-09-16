import { CellGroupForm } from "@/components/forms/cell-group-form";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import { CELL_GROUP_ROLES } from "@/lib/services/cell-group.service";

export default async function NewCellGroupPage() {
  const current = await requireRole(CELL_GROUP_ROLES);
  const selection = await getAdminLocationSelection(current);
  const locationId = current.isSuperAdmin
    ? (selection.locationId ?? "")
    : (current.staffLocationIds[0] ?? current.primaryLocationId ?? "");

  return (
    <>
      <PageHeader
        title="Add cell group"
        description="Organization is taken from your session. Location Admins can only create groups for their campus."
      />
      <CellGroupForm
        lockLocation={!current.isSuperAdmin}
        locations={current.accessibleLocations.map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
        }))}
        defaultValues={{
          location_id: locationId,
          name: "",
          code: "",
          description: "",
          venue: "",
          meeting_weekday: "",
          meeting_time: "",
          leader_member_id: "",
          status: "ACTIVE",
        }}
      />
    </>
  );
}
