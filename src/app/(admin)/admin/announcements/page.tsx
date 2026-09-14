import Link from "next/link";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { withQuery } from "@/lib/admin/query-string";
import { parseListPage } from "@/lib/admin/list-page";
import { requireRole } from "@/lib/auth/require-role";
import { listAnnouncements } from "@/lib/services/announcement.service";
import { canMutateContent, CONTENT_ROLES } from "@/lib/services/event.service";
import { announcementStatusLabel, announcementVisibility, formatDateTime } from "@/lib/utils/format";
import {
  ANNOUNCEMENT_STATUS_FILTERS,
  type AnnouncementStatusFilter,
} from "@/lib/validators/announcement.schema";

type AnnouncementsPageProps = {
  searchParams: Promise<{
    q?: string;
    location?: string;
    status?: string;
    page?: string;
  }>;
};

export default async function AdminAnnouncementsPage({ searchParams }: AnnouncementsPageProps) {
  const current = await requireRole(CONTENT_ROLES);
  const params = await searchParams;
  const status = ANNOUNCEMENT_STATUS_FILTERS.includes(params.status as AnnouncementStatusFilter)
    ? (params.status as AnnouncementStatusFilter)
    : "all";
  const result = await listAnnouncements({
    q: params.q,
    locationId: current.isSuperAdmin ? params.location : undefined,
    status,
    page: parseListPage(params.page),
  });
  const query = {
    q: params.q,
    location: current.isSuperAdmin ? params.location : undefined,
    status,
  };

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Share updates with the organization or a single campus. Expired notices stay hidden from members."
        actions={
          <Link
            href="/admin/announcements/new"
            className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
          >
            Add announcement
          </Link>
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <SearchInput defaultValue={params.q} placeholder="Search title or message" />
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
        <select name="status" defaultValue={status} className={fieldClassName} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="current">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
        </select>
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

      <DataTable isEmpty={result.announcements.length === 0} emptyTitle="No announcements match these filters">
        <DataTableHead>
          <tr>
            <th className="px-4 py-3">Announcement</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Publish</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.announcements.map((item) => {
            const visibility = announcementVisibility(item.publish_date, item.expiry_date);
            return (
              <tr key={item.id} className="text-navy">
                <td className="px-4 py-3 font-medium">{item.title}</td>
                <td className="px-4 py-3">
                  {item.location_name ? `${item.location_name} (${item.location_code})` : "All locations"}
                </td>
                <td className="px-4 py-3">{formatDateTime(item.publish_date)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={visibility} label={announcementStatusLabel(visibility)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/admin/announcements/${item.id}`}
                      className="text-sm font-medium text-maroon hover:underline"
                    >
                      View
                    </Link>
                    {canMutateContent(current, item.location_id) ? (
                      <Link
                        href={`/admin/announcements/${item.id}/edit`}
                        className="text-sm font-medium text-maroon hover:underline"
                      >
                        Edit
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTableBody>
      </DataTable>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        hrefForPage={(page) => withQuery("/admin/announcements", query, { page: String(page) })}
      />
    </>
  );
}
