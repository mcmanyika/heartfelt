import { AnnouncementForm } from "@/components/forms/announcement-form";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import { CONTENT_ROLES } from "@/lib/services/event.service";
import { toDateTimeLocalValue } from "@/lib/utils/format";

export default async function NewAnnouncementPage() {
  const current = await requireRole(CONTENT_ROLES);
  const selection = await getAdminLocationSelection(current);
  const locationId = current.isSuperAdmin
    ? (selection.locationId ?? "")
    : (current.staffLocationIds[0] ?? current.primaryLocationId ?? "");

  return (
    <>
      <PageHeader
        title="Add announcement"
        description="Organization is taken from your session. Location Admins can only publish to their campus."
      />
      <AnnouncementForm
        lockLocation={!current.isSuperAdmin}
        locations={current.accessibleLocations.map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
        }))}
        defaultValues={{
          location_id: locationId,
          title: "",
          message: "",
          publish_date: toDateTimeLocalValue(new Date()),
          expiry_date: "",
        }}
      />
    </>
  );
}
