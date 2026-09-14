import { MemberForm } from "@/components/forms/member-form";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";

export default async function NewMemberPage() {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const selection = await getAdminLocationSelection(current);
  const locationId = current.isSuperAdmin
    ? (selection.locationId ?? "")
    : (current.staffLocationIds[0] ?? current.primaryLocationId ?? "");

  return (
    <>
      <PageHeader
        title="Add member"
        description="A membership number is generated on the server as HIM-CODE-000000."
      />
      <MemberForm
        lockLocation={!current.isSuperAdmin}
        locations={current.accessibleLocations.map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
        }))}
        defaultValues={{
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          location_id: locationId,
          membership_status: "ACTIVE_MEMBER",
          date_joined: new Date().toISOString().slice(0, 10),
          date_of_birth: "",
          gender: "",
          address: "",
        }}
      />
    </>
  );
}
