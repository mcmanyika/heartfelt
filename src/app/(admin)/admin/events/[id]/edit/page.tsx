import { notFound, redirect } from "next/navigation";
import { EventForm } from "@/components/forms/event-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { canMutateContent, CONTENT_ROLES, getEvent } from "@/lib/services/event.service";
import { toDateTimeLocalValue } from "@/lib/utils/format";

type EditEventPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: EditEventPageProps) {
  const current = await requireRole(CONTENT_ROLES);
  const { id } = await params;
  const result = await getEvent(id);

  if (!result.event) {
    notFound();
  }

  const event = result.event;
  if (!canMutateContent(current, event.location_id)) {
    redirect(`/admin/events/${event.id}`);
  }

  return (
    <>
      <PageHeader
        title={`Edit ${event.title}`}
        description="Organization is never taken from the form. Location Admins stay on their campus."
      />
      <EventForm
        eventId={event.id}
        lockLocation={!current.isSuperAdmin}
        locations={current.accessibleLocations.map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
        }))}
        defaultValues={{
          location_id: event.location_id ?? "",
          title: event.title,
          description: event.description ?? "",
          venue: event.venue ?? "",
          start_date: toDateTimeLocalValue(event.start_date),
          end_date: toDateTimeLocalValue(event.end_date),
          registration_required: event.registration_required,
          capacity: event.capacity == null ? "" : String(event.capacity),
        }}
      />
    </>
  );
}
