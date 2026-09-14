import { GivingTable } from "@/components/member/giving-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { parseListPage } from "@/lib/admin/list-page";
import { withQuery } from "@/lib/admin/query-string";
import { listMyGiving } from "@/lib/services/portal.service";
import { formatAmount } from "@/lib/utils/format";
import { TRANSACTION_STATUSES } from "@/lib/validators/giving.schema";
import type { TransactionStatus } from "@/types";

type MemberGivingPageProps = {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
};

export default async function MemberGivingPage({ searchParams }: MemberGivingPageProps) {
  const params = await searchParams;
  const status = TRANSACTION_STATUSES.includes(params.status as TransactionStatus)
    ? (params.status as TransactionStatus)
    : "";
  const giving = await listMyGiving(parseListPage(params.page), params.q, status);
  const query = { q: params.q, status: status || undefined };

  return (
    <>
      <PageHeader
        title="Giving"
        description="Your own giving history. Other members' records are never shown here."
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-3">
        <SearchInput defaultValue={params.q} placeholder="Search reference" />
        <select name="status" defaultValue={status} className={fieldClassName} aria-label="Filter by status">
          <option value="">All statuses</option>
          {TRANSACTION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <div>
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </div>
      </form>

      {giving.totals.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-3">
          {giving.totals.map((total) => (
            <p
              key={total.currency}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-navy"
            >
              This year: {formatAmount(total.amount, total.currency)}
            </p>
          ))}
        </div>
      ) : null}

      <GivingTable rows={giving.rows} />
      <Pagination
        page={giving.page}
        pageCount={giving.pageCount}
        total={giving.total}
        pageSize={giving.pageSize}
        hrefForPage={(page) => withQuery("/member/giving", query, { page: String(page) })}
      />
    </>
  );
}
