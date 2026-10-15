import Link from "next/link";
import { EventCard } from "@/components/member/event-card";
import { GivingTable } from "@/components/member/giving-table";
import { MemberGiveForm } from "@/components/member/member-give-form";
import { EmptyState } from "@/components/ui/empty-state";
import { GivingTotalsValue } from "@/components/ui/giving-totals";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { cancelMyGivingCheckout, getMemberGivingOptions, reconcileMyPendingGiving } from "@/lib/services/member-giving.service";
import {
  getPortalContext,
  listMyAnnouncements,
  listMyEvents,
  listMyGiving,
} from "@/lib/services/portal.service";

type MemberDashboardPageProps = {
  searchParams: Promise<{ giving?: string; session_id?: string }>;
};

export default async function MemberDashboardPage({ searchParams }: MemberDashboardPageProps) {
  const params = await searchParams;
  if (params.giving === "cancelled" && params.session_id) {
    await cancelMyGivingCheckout(params.session_id);
  }
  await reconcileMyPendingGiving();
  const [{ member, location }, giving, events, announcements, givingOptions] = await Promise.all([
    getPortalContext(),
    listMyGiving(1),
    listMyEvents(),
    listMyAnnouncements(),
    getMemberGivingOptions(),
  ]);
  const returnedGift = params.session_id
    ? giving.rows.find((row) => row.transaction_reference === params.session_id)
    : undefined;
  const givingNotice =
    params.giving === "cancelled"
      ? "Payment was cancelled. No charge was made."
      : params.giving === "success" && returnedGift?.status === "SUCCESS"
        ? "Payment confirmed. It is listed in recent giving."
        : params.giving === "success"
          ? "Stripe is still confirming this payment."
          : null;

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
          value={<GivingTotalsValue totals={giving.totals} />}
          hint={giving.totals.length > 0 ? "Successful gifts this year" : "No successful giving this year"}
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

      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-navy">Give</h2>
        <p className="mt-1 mb-4 text-sm text-gray-600">
          Pay with Stripe. The gift shows in recent giving as soon as you return.
        </p>
        {givingNotice ? (
          <p role="status" className="mb-4 text-sm text-navy">
            {givingNotice}
          </p>
        ) : null}
        <MemberGiveForm
          categories={givingOptions.categories}
          configured={givingOptions.configured}
          canGive={givingOptions.canGive}
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
              <article key={item.id} className="rounded-2xl border border-border bg-card p-5">
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
