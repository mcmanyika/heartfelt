import { EventRegisterButton } from "@/components/member/event-register-button";
import type { PortalEvent } from "@/lib/services/portal.service";
import { formatDateTime } from "@/lib/utils/format";

type EventCardProps = {
  event: PortalEvent;
  showActions?: boolean;
};

export function EventCard({ event, showActions = true }: EventCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
        {event.location_name ?? "All locations"}
      </p>
      <h3 className="mt-1 text-base font-semibold text-navy">{event.title}</h3>
      <p className="mt-1 text-sm text-gray-600">{formatDateTime(event.start_date)}</p>
      <p className="text-sm text-gray-600">{event.venue || "Venue to be confirmed"}</p>
      {event.description ? (
        <p className="mt-3 text-sm leading-6 text-gray-600">{event.description}</p>
      ) : null}
      {showActions && event.registration_required ? (
        <div className="mt-4">
          {event.registered ? (
            <p className="mb-2 text-sm font-medium text-emerald-800">You are registered.</p>
          ) : null}
          <EventRegisterButton eventId={event.id} registered={event.registered} />
        </div>
      ) : null}
    </article>
  );
}
