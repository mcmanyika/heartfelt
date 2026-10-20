import Link from "next/link";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { SortHeader } from "@/components/ui/sort-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { parseListPage } from "@/lib/admin/list-page";
import { withQuery } from "@/lib/admin/query-string";
import { parseSortColumn, parseSortDir } from "@/lib/admin/sort";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import {
  listPaymentButtons,
  PAYMENT_BUTTON_MUTATE_ROLES,
  PAYMENT_BUTTON_SORTS,
} from "@/lib/services/payment-button.service";
import { formatAmount } from "@/lib/utils/format";
import { hasAnyRole } from "@/lib/auth/permissions";

type PaymentButtonsPageProps = {
  searchParams: Promise<{
    q?: string;
    location?: string;
    active?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

export default async function AdminPaymentButtonsPage({ searchParams }: PaymentButtonsPageProps) {
  const current = await requireRole(STAFF_ROLES);
  const params = await searchParams;
  const active = params.active === "yes" || params.active === "no" ? params.active : "";
  const sort = parseSortColumn(params.sort, PAYMENT_BUTTON_SORTS, "name");
  const dir = parseSortDir(params.dir, "asc");
  const canMutate = hasAnyRole(current, PAYMENT_BUTTON_MUTATE_ROLES);
  const result = await listPaymentButtons({
    q: params.q,
    locationId: current.isSuperAdmin ? params.location : undefined,
    active,
    page: parseListPage(params.page),
    sort,
    dir,
  });
  const query = {
    q: params.q,
    location: current.isSuperAdmin ? params.location : undefined,
    active: active || undefined,
    sort,
    dir,
  };
  const sortHref = (nextSort: string, nextDir: typeof dir) =>
    withQuery("/admin/payment-buttons", query, { sort: nextSort, dir: nextDir, page: undefined });

  return (
    <>
      <PageHeader
        title="Payment buttons"
        description="Create Stripe buttons to embed on your church website."
        actions={
          canMutate ? (
            <Link
              href="/admin/payment-buttons/new"
              className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
            >
              Add button
            </Link>
          ) : null
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <SearchInput defaultValue={params.q} placeholder="Search name or label" />
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
        <select name="active" defaultValue={active} className={fieldClassName} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="yes">Active</option>
          <option value="no">Inactive</option>
        </select>
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
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

      <DataTable isEmpty={result.buttons.length === 0} emptyTitle="No payment buttons yet">
        <DataTableHead>
          <tr>
            <SortHeader label="Name" column="name" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Campus" column="location" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Category" column="category" sort={sort} dir={dir} hrefFor={sortHref} />
            <th className="px-4 py-3 font-medium">Amount</th>
            <SortHeader label="Status" column="status" sort={sort} dir={dir} hrefFor={sortHref} />
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.buttons.map((button) => (
            <tr key={button.id} className="text-navy">
              <td className="px-4 py-3">
                <p className="font-medium">{button.name}</p>
                <p className="text-xs text-gray-500">{button.button_label}</p>
              </td>
              <td className="px-4 py-3">
                {button.location_name} ({button.location_code})
              </td>
              <td className="px-4 py-3">{button.category_name}</td>
              <td className="px-4 py-3">
                {button.amount_mode === "FIXED" && button.amount !== null
                  ? formatAmount(button.amount, button.currency)
                  : `Open · ${button.currency}`}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={button.active ? "ACTIVE" : "INACTIVE"} />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/payment-buttons/${button.id}`}
                  className="text-sm font-medium text-maroon hover:underline"
                >
                  View
                </Link>
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
        hrefForPage={(page) => withQuery("/admin/payment-buttons", query, { page: String(page) })}
      />
    </>
  );
}
