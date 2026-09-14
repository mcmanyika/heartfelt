import Link from "next/link";
import { LocationStatusButton } from "@/components/admin/location-status-button";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { parseListPage } from "@/lib/admin/list-page";
import { withQuery } from "@/lib/admin/query-string";
import { listLocations } from "@/lib/services/location.service";
import { LOCATION_STATUSES, type LocationStatus } from "@/types";

type LocationsPageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

export default async function AdminLocationsPage({ searchParams }: LocationsPageProps) {
  const params = await searchParams;
  const status = LOCATION_STATUSES.includes(params.status as LocationStatus)
    ? (params.status as LocationStatus)
    : "";
  const result = await listLocations({
    q: params.q,
    status,
    page: parseListPage(params.page),
  });
  const query = { q: params.q, status: status || undefined };

  return (
    <>
      <PageHeader
        title="Locations"
        description="Church campuses connected to Heartfelt International Ministries."
        actions={
          <Link
            href="/admin/locations/new"
            className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
          >
            Add location
          </Link>
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <SearchInput defaultValue={params.q} placeholder="Search name, code, or city" />
        <select name="status" defaultValue={status} className={fieldClassName} aria-label="Filter by status">
          <option value="">All statuses</option>
          {LOCATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value === "ACTIVE" ? "Active" : "Inactive"}
            </option>
          ))}
        </select>
        <div>
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </div>
      </form>

      {"error" in result && result.error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <DataTable isEmpty={result.locations.length === 0} emptyTitle="No locations match these filters">
        <DataTableHead>
          <tr>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">City</th>
            <th className="px-4 py-3">Country</th>
            <th className="px-4 py-3">Members</th>
            <th className="px-4 py-3">Terminals</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.locations.map((location) => (
            <tr key={location.id} className="text-navy">
              <td className="px-4 py-3 font-medium">{location.name}</td>
              <td className="px-4 py-3">{location.code}</td>
              <td className="px-4 py-3">{location.city}</td>
              <td className="px-4 py-3">{location.country}</td>
              <td className="px-4 py-3">{location.member_count}</td>
              <td className="px-4 py-3">{location.terminal_count}</td>
              <td className="px-4 py-3">
                <StatusBadge status={location.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-3">
                  <Link href={`/admin/locations/${location.id}`} className="text-sm font-medium text-maroon hover:underline">
                    View
                  </Link>
                  <Link
                    href={`/admin/locations/${location.id}/edit`}
                    className="text-sm font-medium text-maroon hover:underline"
                  >
                    Edit
                  </Link>
                  <LocationStatusButton locationId={location.id} status={location.status} />
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
        hrefForPage={(page) => withQuery("/admin/locations", query, { page: String(page) })}
      />
    </>
  );
}
