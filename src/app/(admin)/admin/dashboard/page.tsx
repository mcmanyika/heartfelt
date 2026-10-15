import Link from "next/link";
import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { GivingTotalsValue } from "@/components/ui/giving-totals";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboardData, parseDashboardRange } from "@/lib/services/dashboard.service";
import { packagePlanLabel } from "@/lib/billing/plans";
import { getPackageBilling, type PackageBillingView } from "@/lib/services/billing.service";
import { PackageCheckoutForm } from "@/components/admin/package-checkout-form";
import { formatAmount, formatDate, formatDateTime, paymentMethodLabel } from "@/lib/utils/format";

type DashboardPageProps = {
  searchParams: Promise<{ from?: string; to?: string; q?: string; billing?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const range = parseDashboardRange(params.from, params.to);
  const data = await getDashboardData(range, { q: params.q });
  const scope = data.selection.location
    ? `${data.selection.location.name} (${data.selection.location.code})`
    : "all locations";
  const currencies = data.summary.totals.map((total) => total.currency);
  const givingOverTime = Object.keys(data.summary.byMonth)
    .sort()
    .map((month) => ({
      month,
      ...data.summary.byMonth[month],
    }));
  const billing = data.current.isSuperAdmin ? await getPackageBilling() : null;
  const billingNotice =
    params.billing === "cancelled"
      ? "Checkout was cancelled. No payment was recorded."
      : params.billing === "success" && billing?.account?.status === "ACTIVE"
        ? "Payment confirmed."
        : params.billing === "success"
          ? "Stripe accepted the checkout. The payment appears here after Stripe confirms it."
          : null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <Link
            href={`/admin/reports?from=${range.from}&to=${range.to}`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy"
          >
            View reports
          </Link>
        }
      />

      <form className="mb-5 grid items-end gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
        <SearchInput defaultValue={params.q} placeholder="Search listings" />
        <label className="text-sm font-medium text-navy">
          From
          <input
            type="date"
            name="from"
            defaultValue={range.from}
            className={`${fieldClassName} mt-1.5`}
          />
        </label>
        <label className="text-sm font-medium text-navy">
          To
          <input type="date" name="to" defaultValue={range.to} className={`${fieldClassName} mt-1.5`} />
        </label>
        <button type="submit" className="h-11 w-full rounded-lg bg-navy px-5 text-sm font-semibold text-white">
          Apply filters
        </button>
      </form>

      {billing ? (
        <PackageBillingPanel billing={billing} notice={billingNotice} />
      ) : null}

      <section aria-label="Key figures" className="space-y-4">
        <StatCard
          label="Total Giving"
          value={<GivingTotalsValue totals={data.summary.totals} layout="columns" />}
          hint={scope}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Members" value={String(data.memberCount)} hint={scope} />
          <StatCard
            label="Total Transactions"
            value={String(data.summary.successfulCount)}
            hint={`${data.summary.totalCount} recorded in range`}
          />
          <StatCard
            label="Active Locations"
            value={String(data.activeLocations)}
            hint={data.selection.location ? "Selected campus" : "Across the organization"}
          />
          <StatCard
            label="Online Terminals"
            value={String(data.onlineTerminals)}
            hint={`${data.terminalCount} registered`}
          />
        </div>
      </section>

      <DashboardCharts
        givingOverTime={givingOverTime}
        currencies={currencies}
        byCategory={data.summary.byCategory.map((row) => ({ name: row.name, count: row.count }))}
        byMethod={Object.entries(data.summary.byMethod).map(([name, value]) => ({
          name: paymentMethodLabel(name),
          value,
        }))}
        membersByLocation={data.membersByLocation}
      />

      <section aria-label="Activity" className="mt-6 grid gap-4 lg:grid-cols-2">
        <FeedCard
          title="Recent Transactions"
          href="/admin/transactions"
          empty={params.q ? "No matching transactions" : "No giving recorded yet"}
          items={data.recentGiving.map((row) => ({
            id: row.id,
            title: formatAmount(row.amount, row.currency),
            meta: `${row.member_name} · ${row.category_name}`,
            extra: formatDateTime(row.created_at),
          }))}
        />
        <FeedCard
          title="Recent Members"
          href={data.current.isSuperAdmin || data.current.isLocationAdmin ? "/admin/members" : undefined}
          empty={params.q ? "No matching members" : "No members in this scope"}
          items={data.recentMembers.map((member) => ({
            id: member.id,
            title: member.name,
            meta: `${member.membership_number} · ${member.location_name}`,
            extra: formatDate(member.date_joined),
            href:
              data.current.isSuperAdmin || data.current.isLocationAdmin
                ? `/admin/members/${member.id}`
                : undefined,
          }))}
        />
      </section>
    </>
  );
}

function PackageBillingPanel({
  billing,
  notice,
}: {
  billing: PackageBillingView;
  notice: string | null;
}) {
  const account = billing.account;
  const statusLabel =
    account?.status === "ACTIVE" ? "Active" : account?.status === "PAST_DUE" ? "Past due" : "Unpaid";
  const hasPendingPayment = billing.payments.some((payment) => payment.status === "PENDING");
  const showCheckout = account?.status !== "ACTIVE" || hasPendingPayment;

  return (
    <section aria-label="Package billing" className="mb-5 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">Package billing</h2>
          <p className="mt-1 text-sm text-gray-600">
            {account?.plan ? packagePlanLabel(account.plan) : "No package"} · {statusLabel}
            {account?.currentPeriodEnd ? ` · through ${formatDateTime(account.currentPeriodEnd)}` : ""}
          </p>
        </div>
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{statusLabel}</p>
      </div>
      {notice ? <p className="mt-3 text-sm text-navy">{notice}</p> : null}
      {billing.unavailable ? (
        <p className="mt-3 text-sm text-gray-600">
          Package billing is not available until the billing migration is applied.
        </p>
      ) : (
        <>
          {showCheckout ? (
            <>
              {billing.quoteError ? <p className="mt-3 text-sm text-gray-600">{billing.quoteError}</p> : null}
              <PackageCheckoutForm quotes={billing.quotes} configured={billing.configured} />
            </>
          ) : null}
          <h3 className={showCheckout ? "mt-6 text-sm font-semibold text-navy" : "mt-4 text-sm font-semibold text-navy"}>
            Payments
          </h3>
          {billing.payments.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">No package payments yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {billing.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                  <span className="font-medium text-navy">
                    {formatAmount(payment.amountCents / 100, payment.currency.toUpperCase())}
                  </span>
                  <span className="text-gray-600">
                    {packagePlanLabel(payment.plan)} · {payment.locationCount}{" "}
                    {payment.locationCount === 1 ? "location" : "locations"} · {paymentStatusLabel(payment.status)}
                  </span>
                  <span className="text-xs text-gray-500">{formatDateTime(payment.paidAt ?? payment.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function paymentStatusLabel(status: PackageBillingView["payments"][number]["status"]) {
  switch (status) {
    case "PAID":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
  }
}

function FeedCard({
  title,
  href,
  empty,
  items,
}: {
  title: string;
  href?: string;
  empty: string;
  items: Array<{ id: string; title: string; meta: string; extra: string; href?: string }>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-navy">{title}</h2>
        {href ? (
          <Link href={href} className="text-sm font-medium text-maroon hover:underline">
            View all
          </Link>
        ) : null}
      </div>
      {items.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {items.map((item) => {
            const content = (
              <>
                <p className="text-sm font-medium text-navy">{item.title}</p>
                <p className="text-xs text-gray-500">{item.meta}</p>
                <p className="text-xs text-gray-500">{item.extra}</p>
              </>
            );
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="block px-4 py-3 hover:bg-background">
                    {content}
                  </Link>
                ) : (
                  <div className="px-4 py-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
