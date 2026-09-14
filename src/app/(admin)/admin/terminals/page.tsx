import Link from "next/link";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { SortHeader } from "@/components/ui/sort-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { withQuery } from "@/lib/admin/query-string";
import { parseListPage } from "@/lib/admin/list-page";
import { parseSortColumn, parseSortDir } from "@/lib/admin/sort";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import { listTerminals, TERMINAL_SORTS } from "@/lib/services/terminal.service";
import { formatDateTime, terminalStatusLabel } from "@/lib/utils/format";
import { TERMINAL_STATUSES } from "@/lib/validators/terminal.schema";
import type { TerminalStatus } from "@/types";

type TerminalsPageProps = {
  searchParams: Promise<{
    q?: string;
    location?: string;
    status?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

export default async function AdminTerminalsPage({ searchParams }: TerminalsPageProps) {
  const current = await requireRole(STAFF_ROLES);
  const params = await searchParams;
  const status = TERMINAL_STATUSES.includes(params.status as TerminalStatus)
    ? (params.status as TerminalStatus)
    : "";
  const sort = parseSortColumn(params.sort, TERMINAL_SORTS, "code");
  const dir = parseSortDir(params.dir, "asc");
  const canMutate = current.isSuperAdmin || current.isLocationAdmin;
  const result = await listTerminals({
    q: params.q,
    locationId: current.isSuperAdmin ? params.location : undefined,
    status,
    page: parseListPage(params.page),
    sort,
    dir,
  });
  const query = {
    q: params.q,
    location: current.isSuperAdmin ? params.location : undefined,
    status: status || undefined,
    sort,
    dir,
  };
  const sortHref = (nextSort: string, nextDir: typeof dir) =>
    withQuery("/admin/terminals", query, { sort: nextSort, dir: nextDir, page: undefined });

  return (
    <>
      <PageHeader
        title="Payment Terminals"
        actions={
          canMutate ? (
            <Link
              href="/admin/terminals/new"
              className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
            >
              Add terminal
            </Link>
          ) : null
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <SearchInput defaultValue={params.q} placeholder="Search code or device name" />
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
          <option value="">All statuses</option>
          {TERMINAL_STATUSES.map((value) => (
            <option key={value} value={value}>
              {terminalStatusLabel(value)}
            </option>
          ))}
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

      <DataTable isEmpty={result.terminals.length === 0} emptyTitle="No terminals match these filters">
        <DataTableHead>
          <tr>
            <SortHeader label="Code" column="code" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Device" column="device" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Location" column="location" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Status" column="status" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader
              label="Last seen"
              column="last_seen"
              sort={sort}
              dir={dir}
              hrefFor={sortHref}
              defaultDir="desc"
            />
            <th className="px-4 py-3">Actions</th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.terminals.map((terminal) => (
            <tr key={terminal.id} className="text-navy">
              <td className="px-4 py-3 font-medium">{terminal.terminal_code}</td>
              <td className="px-4 py-3">{terminal.device_name}</td>
              <td className="px-4 py-3">
                {terminal.location_name} ({terminal.location_code})
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={terminal.status} label={terminalStatusLabel(terminal.status)} />
              </td>
              <td className="px-4 py-3">{formatDateTime(terminal.last_seen_at)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/admin/terminals/${terminal.id}`}
                    className="text-sm font-medium text-maroon hover:underline"
                  >
                    View
                  </Link>
                  {canMutate ? (
                    <Link
                      href={`/admin/terminals/${terminal.id}/edit`}
                      className="text-sm font-medium text-maroon hover:underline"
                    >
                      Edit
                    </Link>
                  ) : null}
                  <Link
                    href={`/terminal/${terminal.terminal_code}`}
                    className="text-sm font-medium text-maroon hover:underline"
                    target="_blank"
                  >
                    Simulator
                  </Link>
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
        hrefForPage={(page) => withQuery("/admin/terminals", query, { page: String(page) })}
      />
    </>
  );
}
