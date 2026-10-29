import Link from "next/link";
import { EventCard } from "@/components/member/event-card";
import { GivingTable } from "@/components/member/giving-table";
import { MemberGiveForm } from "@/components/member/member-give-form";
import { EmptyState } from "@/components/ui/empty-state";
import { GivingTotalsValue } from "@/components/ui/giving-totals";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  cancelMyGivingCheckout,
  getMemberGivingOptions,
  reconcileMyPendingGiving,
} from "@/lib/services/member-giving.service";
import {
  getPortalContext,
  listMyAnnouncements,
  listMyEvents,
  listMyGiving,
} from "@/lib/services/portal.service";
import { formatDateTime } from "@/lib/utils/format";

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
      ? "Payment cancelled."
      : params.giving === "success" && returnedGift?.status === "SUCCESS"
        ? "Payment confirmed."
        : params.giving === "success"
          ? "Confirming payment…"
          : null;

  return (
    <>
      <PageHeader title="Dashboard" />

      <section aria-label="Summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Campus" value={location?.code ?? "—"} />
        <StatCard label="Giving YTD" value={<GivingTotalsValue totals={giving.totals} />} />
        <StatCard label="Events" value={String(events.length)} />
        <StatCard label="Notices" value={String(announcements.length)} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-navy">Give</h2>
            <Link href="/member/giving" className="text-sm font-medium text-maroon hover:underline">
              History
            </Link>
          </div>
          {givingNotice ? (
            <p role="status" className="mb-3 text-sm text-navy">
              {givingNotice}
            </p>
          ) : null}
          <MemberGiveForm
            categories={givingOptions.categories}
            configured={givingOptions.configured}
            canGive={givingOptions.canGive}
          />
          <div className="mt-5 border-t border-border pt-4">
            <GivingTable rows={giving.rows.slice(0, 3)} compact />
          </div>
        </section>

        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-navy">Events</h2>
              <Link href="/member/events" className="text-sm font-medium text-maroon hover:underline">
                All
              </Link>
            </div>
            {events.length === 0 ? (
              <EmptyState title="No upcoming events" />
            ) : (
              <div className="space-y-3">
                {events.slice(0, 3).map((event) => (
                  <EventCard key={event.id} event={event} showActions={false} compact />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-navy">Announcements</h2>
              <Link
                href="/member/announcements"
                className="text-sm font-medium text-maroon hover:underline"
              >
                All
              </Link>
            </div>
            {announcements.length === 0 ? (
              <EmptyState title="No announcements" />
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {announcements.slice(0, 3).map((item) => (
                  <li key={item.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-navy">{item.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.location_name ?? "All locations"}
                      {item.publish_date ? ` · ${formatDateTime(item.publish_date)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
