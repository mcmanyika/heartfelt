import { EventForm } from "@/components/forms/event-form";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import { CONTENT_ROLES } from "@/lib/services/event.service";

export default async function NewEventPage() {
  const current = await requireRole(CONTENT_ROLES);
  const selection = await getAdminLocationSelection(current);
  const locationId = current.isSuperAdmin
    ? (selection.locationId ?? "")
    : (current.staffLocationIds[0] ?? current.primaryLocationId ?? "");

  return (
    <>
      <PageHeader
        title="Add event"
        description="Organization is taken from your session. Location Admins can only publish to their campus."
      />
      <EventForm
        lockLocation={!current.isSuperAdmin}
        locations={current.accessibleLocations.map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
        }))}
        defaultValues={{
          location_id: locationId,
          title: "",
          description: "",
          venue: "",
          start_date: "",
          end_date: "",
          registration_required: false,
          capacity: "",
        }}
      />
    </>
  );
}
