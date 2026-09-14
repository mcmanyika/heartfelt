import Link from "next/link";
import { notFound } from "next/navigation";
import { EventDeleteButton } from "@/components/admin/event-delete-button";
import { EventRegistrationActions } from "@/components/admin/event-registration-actions";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/require-role";
import {
  canMutateContent,
  CONTENT_ROLES,
  getEvent,
  listEventRegistrations,
} from "@/lib/services/event.service";
import { eventRegistrationStatusLabel, formatDateTime } from "@/lib/utils/format";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const current = await requireRole(CONTENT_ROLES);
  const { id } = await params;
  const [{ event }, registrations] = await Promise.all([getEvent(id), listEventRegistrations(id)]);

  if (!event) {
    notFound();
  }

  const canMutate = canMutateContent(current, event.location_id);
  const registeredCount = registrations.rows.filter((row) => row.status !== "CANCELLED").length;

  return (
    <>
      <PageHeader
        title={event.title}
        description={event.location_name ? `${event.location_name} (${event.location_code})` : "All locations"}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {canMutate ? (
              <>
                <Link
                  href={`/admin/events/${event.id}/edit`}
                  className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
                >
                  Edit
                </Link>
                <EventDeleteButton eventId={event.id} />
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Details</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Venue</dt>
              <dd className="text-navy">{event.venue || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Starts</dt>
              <dd className="text-navy">{formatDateTime(event.start_date)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ends</dt>
              <dd className="text-navy">{formatDateTime(event.end_date)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Registration</dt>
              <dd className="text-navy">
                {event.registration_required
                  ? event.capacity
                    ? `Required · ${registeredCount} / ${event.capacity}`
                    : `Required · ${registeredCount} registered`
                  : "Not required"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Description</h2>
          <p className="mt-4 text-sm leading-6 text-gray-600">{event.description || "No description yet."}</p>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-navy">Registrations</h2>
        {registrations.error ? (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {registrations.error}
          </p>
        ) : null}
        <DataTable isEmpty={registrations.rows.length === 0} emptyTitle="No registrations yet">
          <DataTableHead>
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {registrations.rows.map((row) => (
              <tr key={row.id} className="text-navy">
                <td className="px-4 py-3 font-medium">{row.member_name}</td>
                <td className="px-4 py-3">{row.membership_number}</td>
                <td className="px-4 py-3">{formatDateTime(row.registered_at)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} label={eventRegistrationStatusLabel(row.status)} />
                </td>
                <td className="px-4 py-3">
                  <EventRegistrationActions eventId={event.id} registrationId={row.id} status={row.status} />
                </td>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </section>
    </>
  );
}
