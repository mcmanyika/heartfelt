import { EventRegisterButton } from "@/components/member/event-register-button";
import type { PortalEvent } from "@/lib/services/portal.service";
import { eventAttendanceModeLabel, formatAmount, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type EventCardProps = {
  event: PortalEvent;
  showActions?: boolean;
  compact?: boolean;
};

export function EventCard({ event, showActions = true, compact = false }: EventCardProps) {
  return (
    <article className={cn("rounded-2xl border border-border bg-card", compact ? "p-4" : "p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-navy">{event.title}</h3>
          <p className="mt-0.5 text-sm text-gray-600">{formatDateTime(event.start_date)}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900">
            {eventAttendanceModeLabel(event.attendance_mode)}
          </span>
          {event.is_paid && event.price != null && event.currency ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
              {formatAmount(event.price, event.currency)}
            </span>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <>
          <p className="mt-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
            {event.location_name ?? "All locations"}
          </p>
          {event.attendance_mode !== "ONLINE" ? (
            <p className="mt-1 text-sm text-gray-600">{event.venue || "Venue TBD"}</p>
          ) : null}
          {event.online_url ? (
            <p className="mt-1 text-sm">
              <a
                href={event.online_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-maroon hover:underline"
              >
                Join online
              </a>
            </p>
          ) : null}
          {event.description ? (
            <p className="mt-3 text-sm leading-6 text-gray-600">{event.description}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-1 text-xs text-gray-500">
          {[event.location_name, event.attendance_mode !== "ONLINE" ? event.venue : null]
            .filter(Boolean)
            .join(" · ") || "Details on events page"}
        </p>
      )}

      {showActions && event.registration_required ? (
        <div className="mt-4">
          {event.registered ? (
            <p className="mb-2 text-sm font-medium text-emerald-800">Registered</p>
          ) : null}
          {event.pendingPayment ? (
            <p className="mb-2 text-sm font-medium text-amber-800">Payment pending</p>
          ) : null}
          <EventRegisterButton
            eventId={event.id}
            registered={event.registered}
            pendingPayment={event.pendingPayment}
            isPaid={event.is_paid}
            price={event.price}
            currency={event.currency}
          />
        </div>
      ) : null}
    </article>
  );
}
