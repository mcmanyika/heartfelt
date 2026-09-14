import Link from "next/link";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { SortHeader } from "@/components/ui/sort-header";
import { withQuery } from "@/lib/admin/query-string";
import { parseListPage } from "@/lib/admin/list-page";
import { parseSortColumn, parseSortDir } from "@/lib/admin/sort";
import { requireRole } from "@/lib/auth/require-role";
import { canMutateContent, CONTENT_ROLES, EVENT_SORTS, listEvents } from "@/lib/services/event.service";
import { formatDateTime } from "@/lib/utils/format";
import { EVENT_WHEN_FILTERS, type EventWhenFilter } from "@/lib/validators/event.schema";

type EventsPageProps = {
  searchParams: Promise<{
    q?: string;
    location?: string;
    when?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

export default async function AdminEventsPage({ searchParams }: EventsPageProps) {
  const current = await requireRole(CONTENT_ROLES);
  const params = await searchParams;
  const when = EVENT_WHEN_FILTERS.includes(params.when as EventWhenFilter)
    ? (params.when as EventWhenFilter)
    : "upcoming";
  const sort = parseSortColumn(params.sort, EVENT_SORTS, "starts");
  const dir = parseSortDir(params.dir, when === "past" ? "desc" : "asc");
  const result = await listEvents({
    q: params.q,
    locationId: current.isSuperAdmin ? params.location : undefined,
    when,
    page: parseListPage(params.page),
    sort,
    dir,
  });
  const query = {
    q: params.q,
    location: current.isSuperAdmin ? params.location : undefined,
    when,
    sort,
    dir,
  };
  const sortHref = (nextSort: string, nextDir: typeof dir) =>
    withQuery("/admin/events", query, { sort: nextSort, dir: nextDir, page: undefined });

  return (
    <>
      <PageHeader
        title="Events"
        actions={
          <Link href="/admin/events/new" className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white">
            Add event
          </Link>
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <SearchInput defaultValue={params.q} placeholder="Search title or venue" />
        {current.isSuperAdmin ? (
          <select
            name="location"
            defaultValue={params.location ?? result.locationId ?? ""}
            className={fieldClassName}
            aria-label="Filter by location"
          >
            <option value="">All locations</option>
            {current.accessibleLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.code})
              </option>
            ))}
          </select>
        ) : null}
        <select name="when" defaultValue={when} className={fieldClassName} aria-label="Filter by time">
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All dates</option>
        </select>
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <div>
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </div>
      </form>

      {result.error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <DataTable isEmpty={result.events.length === 0} emptyTitle="No events match these filters">
        <DataTableHead>
          <tr>
            <SortHeader label="Event" column="title" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Location" column="location" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader
              label="Starts"
              column="starts"
              sort={sort}
              dir={dir}
              hrefFor={sortHref}
              defaultDir={when === "past" ? "desc" : "asc"}
            />
            <SortHeader label="Registration" column="registration" sort={sort} dir={dir} hrefFor={sortHref} />
            <th className="px-4 py-3">Actions</th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.events.map((event) => (
            <tr key={event.id} className="text-navy">
              <td className="px-4 py-3">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-gray-500">{event.venue || "Venue to be confirmed"}</p>
              </td>
              <td className="px-4 py-3">
                {event.location_name ? `${event.location_name} (${event.location_code})` : "All locations"}
              </td>
              <td className="px-4 py-3">{formatDateTime(event.start_date)}</td>
              <td className="px-4 py-3">
                {event.registration_required
                  ? event.capacity
                    ? `Required · ${event.capacity} seats`
                    : "Required"
                  : "Open"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-3">
                  <Link href={`/admin/events/${event.id}`} className="text-sm font-medium text-maroon hover:underline">
                    View
                  </Link>
                  {canMutateContent(current, event.location_id) ? (
                    <Link
                      href={`/admin/events/${event.id}/edit`}
                      className="text-sm font-medium text-maroon hover:underline"
                    >
                      Edit
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </DataTableBody>
      </DataTable>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        hrefForPage={(page) => withQuery("/admin/events", query, { page: String(page) })}
      />
    </>
  );
}
