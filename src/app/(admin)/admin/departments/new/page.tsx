import { DepartmentForm } from "@/components/forms/department-form";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import { DEPARTMENT_ROLES } from "@/lib/services/department.service";

export default async function NewDepartmentPage() {
  const current = await requireRole(DEPARTMENT_ROLES);
  const selection = await getAdminLocationSelection(current);
  const locationId = current.isSuperAdmin
    ? (selection.locationId ?? "")
    : (current.staffLocationIds[0] ?? current.primaryLocationId ?? "");

  return (
    <>
      <PageHeader
        title="Add department"
        description="Organization is taken from your session. Location Admins can only create departments for their campus."
      />
      <DepartmentForm
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
          leader_member_id: "",
          status: "ACTIVE",
        }}
      />
    </>
  );
}
