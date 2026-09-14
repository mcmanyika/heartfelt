import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { SortHeader } from "@/components/ui/sort-header";
import { withQuery } from "@/lib/admin/query-string";
import { parseSortColumn, parseSortDir } from "@/lib/admin/sort";
import { AUDIT_SORTS, listAuditLogs } from "@/lib/services/audit.service";
import { auditActionLabel, formatDateTime } from "@/lib/utils/format";

const ENTITY_TYPES = [
  "organization",
  "location",
  "profile",
  "member",
  "member_family_link",
  "giving_category",
  "giving_transaction",
  "payment_terminal",
  "event",
  "event_registration",
  "announcement",
] as const;

type AuditPageProps = {
  searchParams: Promise<{
    q?: string;
    entity?: string;
    from?: string;
    to?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;
  const entityType = ENTITY_TYPES.includes(params.entity as (typeof ENTITY_TYPES)[number])
    ? params.entity
    : undefined;
  const sort = parseSortColumn(params.sort, AUDIT_SORTS, "when");
  const dir = parseSortDir(params.dir, "desc");
  const result = await listAuditLogs({
    q: params.q,
    entityType,
    from: params.from,
    to: params.to,
    page: Number(params.page ?? "1") || 1,
    sort,
    dir,
  });
  const query = {
    q: params.q,
    entity: entityType,
    from: params.from,
    to: params.to,
    sort,
    dir,
  };
  const sortHref = (nextSort: string, nextDir: typeof dir) =>
    withQuery("/admin/audit", query, { sort: nextSort, dir: nextDir, page: undefined });

  return (
    <>
      <PageHeader title="Audit log" />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-5">
        <SearchInput defaultValue={params.q} placeholder="Search action or entity" />
        <select
          name="entity"
          defaultValue={entityType ?? ""}
          className={fieldClassName}
          aria-label="Filter by entity"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.map((entity) => (
            <option key={entity} value={entity}>
              {entity.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={params.from ?? ""}
          className={fieldClassName}
          aria-label="From date"
        />
        <input type="date" name="to" defaultValue={params.to ?? ""} className={fieldClassName} aria-label="To date" />
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
          Apply filters
        </button>
      </form>

      {"error" in result && result.error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <DataTable isEmpty={result.rows.length === 0} emptyTitle="No audit events in this range">
        <DataTableHead>
          <tr>
            <SortHeader
              label="When"
              column="when"
              sort={sort}
              dir={dir}
              hrefFor={sortHref}
              defaultDir="desc"
            />
            <SortHeader label="Actor" column="actor" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Action" column="action" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Entity" column="entity" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Details" column="details" sort={sort} dir={dir} hrefFor={sortHref} />
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.rows.map((row) => (
            <tr key={row.id} className="text-navy">
              <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
              <td className="px-4 py-3">{row.actor_name}</td>
              <td className="px-4 py-3">{auditActionLabel(row.action)}</td>
              <td className="px-4 py-3">
                <p>{row.entity_type.replace(/_/g, " ")}</p>
                {row.entity_id ? <p className="text-xs text-gray-500">{row.entity_id}</p> : null}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {row.ip_address ? <p>IP {row.ip_address}</p> : null}
                <p className="max-w-xs truncate" title={JSON.stringify(row.metadata)}>
                  {JSON.stringify(row.metadata) === "{}" ? "—" : JSON.stringify(row.metadata)}
                </p>
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
        hrefForPage={(page) => withQuery("/admin/audit", query, { page: page > 1 ? String(page) : undefined })}
      />
    </>
  );
}
