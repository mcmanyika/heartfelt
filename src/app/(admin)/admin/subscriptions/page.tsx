import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { SortHeader } from "@/components/ui/sort-header";
import { withQuery } from "@/lib/admin/query-string";
import { parseSortColumn, parseSortDir, type SortDir } from "@/lib/admin/sort";
import {
  listDenominationSubscriptions,
  type DenominationSubscription,
} from "@/lib/services/platform-billing.service";
import { formatAmount, formatDateTime } from "@/lib/utils/format";

const SUBSCRIPTION_SORTS = ["name", "plan", "status", "locations", "payment", "period"] as const;

type SubscriptionsPageProps = {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
};

function statusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "PAST_DUE":
      return "Past due";
    case "PAID":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    default:
      return "Unpaid";
  }
}

function statusRank(status: DenominationSubscription["status"]) {
  if (status === "ACTIVE") return 0;
  if (status === "PAST_DUE") return 1;
  return 2;
}

function compareText(left: string, right: string, dir: SortDir) {
  const result = left.localeCompare(right, undefined, { sensitivity: "base" });
  return dir === "asc" ? result : -result;
}

function compareNumber(left: number | null, right: number | null, dir: SortDir) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return dir === "asc" ? left - right : right - left;
}

function matchesQuery(row: DenominationSubscription, query: string) {
  const haystack = [
    row.name,
    row.slug,
    row.shortCode,
    row.planLabel,
    statusLabel(row.status),
    row.paymentStatus ? statusLabel(row.paymentStatus) : "No payment",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const sort = parseSortColumn(params.sort, SUBSCRIPTION_SORTS, "name");
  const dir = parseSortDir(params.dir, "asc");
  const { rows, error } = await listDenominationSubscriptions();
  const filtered = rows.filter((row) => (query ? matchesQuery(row, query.toLowerCase()) : true));
  filtered.sort((left, right) => {
    switch (sort) {
      case "plan":
        return compareText(left.planLabel, right.planLabel, dir) || compareText(left.name, right.name, "asc");
      case "status":
        return compareNumber(statusRank(left.status), statusRank(right.status), dir) || compareText(left.name, right.name, "asc");
      case "locations":
        return compareNumber(left.locationCount, right.locationCount, dir) || compareText(left.name, right.name, "asc");
      case "payment":
        return compareNumber(left.amountCents, right.amountCents, dir) || compareText(left.name, right.name, "asc");
      case "period":
        return (
          compareNumber(
            left.periodEnd ? Date.parse(left.periodEnd) : null,
            right.periodEnd ? Date.parse(right.periodEnd) : null,
            dir,
          ) || compareText(left.name, right.name, "asc")
        );
      default:
        return compareText(left.name, right.name, dir);
    }
  });
  const activeCount = filtered.filter((row) => row.status === "ACTIVE").length;
  const listQuery = { q: query || undefined, sort, dir };
  const sortHref = (nextSort: string, nextDir: SortDir) =>
    withQuery("/admin/subscriptions", listQuery, { sort: nextSort, dir: nextDir });
  const denominationLabel = filtered.length === 1 ? "denomination" : "denominations";

  return (
    <>
      <PageHeader title="Subscriptions" description="Packages paid by each denomination." />
      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-[1fr_auto]">
        <SearchInput defaultValue={query} placeholder="Search denomination, code, or package" />
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <p className="mb-4 text-sm text-gray-600">
        {activeCount} active · {filtered.length} {denominationLabel}
      </p>
      <DataTable
        isEmpty={filtered.length === 0}
        emptyTitle={query ? "No denominations match this search" : "No denominations yet"}
      >
        <DataTableHead>
          <tr>
            <SortHeader label="Denomination" column="name" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Package" column="plan" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Status" column="status" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader
              label="Locations"
              column="locations"
              sort={sort}
              dir={dir}
              hrefFor={sortHref}
              defaultDir="desc"
            />
            <SortHeader
              label="Latest payment"
              column="payment"
              sort={sort}
              dir={dir}
              hrefFor={sortHref}
              defaultDir="desc"
            />
            <SortHeader
              label="Access until"
              column="period"
              sort={sort}
              dir={dir}
              hrefFor={sortHref}
              defaultDir="desc"
            />
          </tr>
        </DataTableHead>
        <DataTableBody>
          {filtered.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-navy">{row.name}</p>
                <p className="text-xs text-gray-500">
                  {row.shortCode} · {row.slug}
                </p>
              </td>
              <td className="px-4 py-3 text-navy">{row.planLabel}</td>
              <td className="px-4 py-3 text-navy">{statusLabel(row.status)}</td>
              <td className="px-4 py-3 text-navy">{row.locationCount || "—"}</td>
              <td className="px-4 py-3">
                {row.amountCents !== null && row.currency ? (
                  <>
                    <p className="font-medium text-navy">{formatAmount(row.amountCents / 100, row.currency.toUpperCase())}</p>
                    <p className="text-xs text-gray-500">
                      {row.paymentStatus ? statusLabel(row.paymentStatus) : "Unpaid"}
                      {row.paidAt ? ` · ${formatDateTime(row.paidAt)}` : ""}
                    </p>
                  </>
                ) : (
                  <span className="text-gray-500">No payment</span>
                )}
              </td>
              <td className="px-4 py-3 text-navy">{row.periodEnd ? formatDateTime(row.periodEnd) : "—"}</td>
            </tr>
          ))}
        </DataTableBody>
      </DataTable>
    </>
  );
}
