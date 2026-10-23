import { EventCard } from "@/components/member/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { LIST_PAGE_SIZE, listPageCount, parseListPage } from "@/lib/admin/list-page";
import { withQuery } from "@/lib/admin/query-string";
import {
  cancelEventRegistrationCheckout,
  reconcileEventRegistrationSession,
} from "@/lib/services/event-registration-payment.service";
import { listMyEvents } from "@/lib/services/portal.service";

type MemberEventsPageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    registration?: string;
    session_id?: string;
  }>;
};

export default async function MemberEventsPage({ searchParams }: MemberEventsPageProps) {
  const params = await searchParams;
  if (params.session_id && params.registration === "success") {
    await reconcileEventRegistrationSession(params.session_id);
  }
  if (params.session_id && params.registration === "cancelled") {
    await cancelEventRegistrationCheckout(params.session_id);
  }

  const page = parseListPage(params.page);
  const all = await listMyEvents();
  const q = params.q?.trim().toLowerCase() ?? "";
  const matches = q
    ? all.filter((event) =>
        `${event.title} ${event.venue ?? ""} ${event.location_name ?? ""}`.toLowerCase().includes(q),
      )
    : all;
  const pageCount = listPageCount(matches.length);
  const events = matches.slice((page - 1) * LIST_PAGE_SIZE, page * LIST_PAGE_SIZE);
  const notice =
    params.registration === "cancelled"
      ? "Checkout was cancelled. No payment was taken."
      : params.registration === "success"
        ? "Payment received. Your registration is confirmed."
        : null;

  return (
    <>
      <PageHeader
        title="Events"
        description="Organization-wide gatherings and events at your campus."
      />
      {notice ? (
        <p className="mb-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-navy">{notice}</p>
      ) : null}
      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-3">
        <SearchInput defaultValue={params.q} placeholder="Search title or venue" />
        <div>
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </div>
      </form>
      {events.length === 0 ? (
        <EmptyState
          title="No upcoming events"
          description="When Head Office or your campus publishes an event, it will appear here."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
      <Pagination
        page={Math.min(page, pageCount)}
        pageCount={pageCount}
        total={matches.length}
        pageSize={LIST_PAGE_SIZE}
        hrefForPage={(next) => withQuery("/member/events", { q: params.q }, { page: String(next) })}
      />
    </>
  );
}
