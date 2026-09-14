import Link from "next/link";
import { EventCard } from "@/components/member/event-card";
import { GivingTable } from "@/components/member/giving-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  getPortalContext,
  listMyAnnouncements,
  listMyEvents,
  listMyGiving,
} from "@/lib/services/portal.service";
import { formatAmount } from "@/lib/utils/format";

export default async function MemberDashboardPage() {
  const [{ member, location }, giving, events, announcements] = await Promise.all([
    getPortalContext(),
    listMyGiving(1),
    listMyEvents(),
    listMyAnnouncements(),
  ]);

  const givingHint =
    giving.totals.length > 0
      ? giving.totals.map((total) => formatAmount(total.amount, total.currency)).join(" · ")
      : "No successful giving this year";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your campus, giving, and the gatherings that apply to you."
      />

      <section aria-label="Summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="My location"
          value={location ? location.code : "—"}
          hint={location ? `${location.name}, ${location.city}` : "No campus linked yet"}
        />
        <StatCard
          label="Membership number"
          value={member?.membership_number ?? "—"}
          hint={member ? "Assigned for life" : "Ask your campus office to link your record"}
        />
        <StatCard
          label="Giving this year"
          value={giving.totals.length === 1 ? formatAmount(giving.totals[0].amount, giving.totals[0].currency) : giving.totals.length ? `${giving.totals.length} currencies` : "—"}
          hint={givingHint}
        />
        <StatCard
          label="Upcoming events"
          value={String(events.length)}
          hint={events[0]?.title ?? "Nothing scheduled yet"}
        />
        <StatCard
          label="Announcements"
          value={String(announcements.length)}
          hint={announcements[0]?.title ?? "No current notices"}
        />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-navy">Recent giving</h2>
          <Link href="/member/giving" className="text-sm font-medium text-maroon hover:underline">
            View history
          </Link>
        </div>
        <GivingTable rows={giving.rows.slice(0, 4)} />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-navy">Upcoming events</h2>
          <Link href="/member/events" className="text-sm font-medium text-maroon hover:underline">
            All events
          </Link>
        </div>
        {events.length === 0 ? (
          <EmptyState title="No upcoming events" description="Organization-wide and campus events will appear here." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {events.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} showActions={false} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-navy">Announcements</h2>
          <Link href="/member/announcements" className="text-sm font-medium text-maroon hover:underline">
            All announcements
          </Link>
        </div>
        {announcements.length === 0 ? (
          <EmptyState title="No announcements" description="Current notices from Head Office and your campus will appear here." />
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 4).map((item) => (
              <article key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                  {item.location_name ?? "All locations"}
                </p>
                <h3 className="mt-1 font-semibold text-navy">{item.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{item.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
