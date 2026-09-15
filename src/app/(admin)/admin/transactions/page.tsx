import Link from "next/link";
import { TransactionsTable } from "@/components/admin/transactions-table";
import { SortHeader } from "@/components/ui/sort-header";
import { DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { withQuery } from "@/lib/admin/query-string";
import { parseSortColumn, parseSortDir } from "@/lib/admin/sort";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import { listGivingCategories, listTransactions, TRANSACTION_SORTS } from "@/lib/services/giving.service";
import { paymentMethodLabel } from "@/lib/utils/format";
import { MANUAL_PAYMENT_METHODS, TRANSACTION_STATUSES } from "@/lib/validators/giving.schema";
import { MVP_CURRENCIES, type MvpCurrency, type PaymentMethod, type TransactionStatus } from "@/types";

type TransactionsPageProps = {
  searchParams: Promise<{
    q?: string;
    location?: string;
    member?: string;
    anonymous?: string;
    category?: string;
    method?: string;
    currency?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

export default async function AdminTransactionsPage({ searchParams }: TransactionsPageProps) {
  const current = await requireRole(STAFF_ROLES);
  const params = await searchParams;
  const anonymous = params.anonymous === "yes" || params.anonymous === "no" ? params.anonymous : "";
  const paymentMethod = MANUAL_PAYMENT_METHODS.includes(params.method as (typeof MANUAL_PAYMENT_METHODS)[number])
    ? (params.method as PaymentMethod)
    : "";
  const currency = MVP_CURRENCIES.includes(params.currency as MvpCurrency)
    ? (params.currency as MvpCurrency)
    : "";
  const status = TRANSACTION_STATUSES.includes(params.status as TransactionStatus)
    ? (params.status as TransactionStatus)
    : "";
  const sort = parseSortColumn(params.sort, TRANSACTION_SORTS, "date");
  const dir = parseSortDir(params.dir, "desc");

  const [{ categories }, result] = await Promise.all([
    listGivingCategories(),
    listTransactions({
      q: params.q,
      locationId: current.isSuperAdmin ? params.location : undefined,
      member: params.member,
      anonymous,
      categoryId: params.category,
      paymentMethod,
      currency,
      status,
      from: params.from,
      to: params.to,
      page: Number(params.page ?? "1") || 1,
      sort,
      dir,
    }),
  ]);

  const query = {
    q: params.q,
    location: current.isSuperAdmin ? params.location : undefined,
    member: params.member,
    anonymous: anonymous || undefined,
    category: params.category,
    method: paymentMethod || undefined,
    currency: currency || undefined,
    status: status || undefined,
    from: params.from,
    to: params.to,
    sort,
    dir,
  };

  const sortHref = (nextSort: string, nextDir: typeof dir) =>
    withQuery("/admin/transactions", query, { sort: nextSort, dir: nextDir, page: undefined });

  return (
    <>
      <PageHeader
        title="Giving & Transactions"
        actions={
          <div className="flex flex-wrap gap-3">
            {current.isSuperAdmin ? (
              <Link
                href="/admin/giving/categories"
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-navy"
              >
                Categories
              </Link>
            ) : null}
            <Link
              href="/admin/transactions/new"
              className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
            >
              Record giving
            </Link>
          </div>
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <SearchInput defaultValue={params.q} placeholder="Search reference" />
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
        <SearchInput name="member" defaultValue={params.member} placeholder="Member name or number" />
        <select
          name="anonymous"
          defaultValue={anonymous}
          className={fieldClassName}
          aria-label="Filter named or anonymous giving"
        >
          <option value="">Named and anonymous</option>
          <option value="no">Named members</option>
          <option value="yes">Anonymous only</option>
        </select>
        <select
          name="category"
          defaultValue={params.category ?? ""}
          className={fieldClassName}
          aria-label="Filter by giving category"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          name="method"
          defaultValue={paymentMethod}
          className={fieldClassName}
          aria-label="Filter by payment method"
        >
          <option value="">All payment methods</option>
          {MANUAL_PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {paymentMethodLabel(method)}
            </option>
          ))}
        </select>
        <select
          name="currency"
          defaultValue={currency}
          className={fieldClassName}
          aria-label="Filter by currency"
        >
          <option value="">All currencies</option>
          {MVP_CURRENCIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className={fieldClassName} aria-label="Filter by status">
          <option value="">All statuses</option>
          {TRANSACTION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={params.from}
          className={fieldClassName}
          aria-label="From date"
        />
        <input type="date" name="to" defaultValue={params.to} className={fieldClassName} aria-label="To date" />
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <div className="md:col-span-4">
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

      <TransactionsTable transactions={result.transactions}>
        <DataTableHead>
          <tr>
            <SortHeader label="Reference" column="reference" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Member" column="member" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Location" column="location" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Category" column="category" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Amount" column="amount" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Currency" column="currency" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader
              label="Payment method"
              column="method"
              sort={sort}
              dir={dir}
              hrefFor={sortHref}
            />
            <SortHeader label="Status" column="status" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader
              label="Date"
              column="date"
              sort={sort}
              dir={dir}
              hrefFor={sortHref}
              defaultDir="desc"
            />
          </tr>
        </DataTableHead>
      </TransactionsTable>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        hrefForPage={(page) => withQuery("/admin/transactions", query, { page: String(page) })}
      />
    </>
  );
}
