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
import { STAFF_ROLES } from "@/lib/auth/types";
import { listTerminals } from "@/lib/services/terminal.service";
import { formatDateTime, terminalStatusLabel } from "@/lib/utils/format";
import { TERMINAL_STATUSES } from "@/lib/validators/terminal.schema";
import type { TerminalStatus } from "@/types";

type TerminalsPageProps = {
  searchParams: Promise<{
    q?: string;
    location?: string;
    status?: string;
    page?: string;
  }>;
};

export default async function AdminTerminalsPage({ searchParams }: TerminalsPageProps) {
  const current = await requireRole(STAFF_ROLES);
  const params = await searchParams;
  const status = TERMINAL_STATUSES.includes(params.status as TerminalStatus)
    ? (params.status as TerminalStatus)
    : "";
  const canMutate = current.isSuperAdmin || current.isLocationAdmin;
  const result = await listTerminals({
    q: params.q,
    locationId: current.isSuperAdmin ? params.location : undefined,
    status,
    page: parseListPage(params.page),
  });
  const query = {
    q: params.q,
    location: current.isSuperAdmin ? params.location : undefined,
    status: status || undefined,
  };

  return (
    <>
      <PageHeader
        title="Payment Terminals"
        description="Assign and monitor campus kiosks. Simulated payments never leave this system."
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
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Device</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last seen</th>
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
