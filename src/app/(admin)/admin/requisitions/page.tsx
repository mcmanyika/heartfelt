import { RequisitionsTable } from "@/components/admin/requisitions-table";
import { DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SortHeader } from "@/components/ui/sort-header";
import { withQuery } from "@/lib/admin/query-string";
import { parseSortColumn, parseSortDir } from "@/lib/admin/sort";
import { requireRole } from "@/lib/auth/require-role";
import {
  listStaffRequisitions,
  REQUISITION_ROLES,
  REQUISITION_SORTS,
} from "@/lib/services/requisition.service";
import { REQUISITION_STATUSES } from "@/lib/validators/requisition.schema";
import type { FinancialRequisitionStatus } from "@/types";

type RequisitionsPageProps = {
  searchParams: Promise<{ page?: string; status?: string; sort?: string; dir?: string }>;
};

export default async function AdminRequisitionsPage({ searchParams }: RequisitionsPageProps) {
  await requireRole(REQUISITION_ROLES);
  const params = await searchParams;
  const statusParam = params.status ?? "SUBMITTED";
  const status =
    statusParam === "all" ||
    REQUISITION_STATUSES.includes(statusParam as FinancialRequisitionStatus)
      ? (statusParam as FinancialRequisitionStatus | "all")
      : "SUBMITTED";
  const sort = parseSortColumn(params.sort, REQUISITION_SORTS, "submitted");
  const dir = parseSortDir(params.dir, "desc");

  const result = await listStaffRequisitions({
    page: Number(params.page ?? "1") || 1,
    status,
    sort,
    dir,
  });

  const query = { status, sort, dir };
  const sortHref = (nextSort: string, nextDir: typeof dir) =>
    withQuery("/admin/requisitions", query, { sort: nextSort, dir: nextDir, page: undefined });

  return (
    <>
      <PageHeader title="Requisitions" />

      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        <select
          name="status"
          defaultValue={status}
          className={`${fieldClassName} min-w-[10rem]`}
          aria-label="Filter by status"
        >
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="all">All</option>
        </select>
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <button type="submit" className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white">
          Apply
        </button>
      </form>

      {result.error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <RequisitionsTable rows={result.rows}>
        <DataTableHead>
          <tr>
            <SortHeader label="Requester" column="requester" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Department" column="department" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Amount" column="amount" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Purpose" column="purpose" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader
              label="Submitted"
              column="submitted"
              sort={sort}
              dir={dir}
              hrefFor={sortHref}
              defaultDir="desc"
            />
            <SortHeader label="Status" column="status" sort={sort} dir={dir} hrefFor={sortHref} />
            <th className="px-4 py-3">Actions</th>
          </tr>
        </DataTableHead>
      </RequisitionsTable>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        hrefForPage={(page) =>
          withQuery("/admin/requisitions", query, { page: String(page) })
        }
      />
    </>
  );
}
