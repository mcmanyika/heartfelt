import Link from "next/link";
import { RecentTransactionsFeed } from "@/components/admin/recent-transactions-feed";
import { DashboardCharts, MembersByGenderChart } from "@/components/charts/dashboard-charts";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { GivingTotalsValue } from "@/components/ui/giving-totals";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboardData, parseDashboardRange } from "@/lib/services/dashboard.service";
import { formatDate, paymentMethodLabel } from "@/lib/utils/format";

type DashboardPageProps = {
  searchParams: Promise<{ from?: string; to?: string; q?: string }>;
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
  const rangeQuery = `from=${range.from}&to=${range.to}`;
  const transactionsHref = `/admin/transactions?${rangeQuery}`;
  const reportsHref = `/admin/reports?${rangeQuery}`;
  const membersHref =
    data.current.isSuperAdmin || data.current.isLocationAdmin ? "/admin/members" : undefined;
  const locationsHref = data.current.isSuperAdmin ? "/admin/locations" : undefined;

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <Link
            href={reportsHref}
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

      <section aria-label="Giving and members" className="mb-5 grid gap-4 md:grid-cols-2">
        <StatCard
          label="Total Giving"
          value={<GivingTotalsValue totals={data.summary.totals} layout="columns" />}
          hint={scope}
          href={transactionsHref}
        />
        <MembersByGenderChart membersByGender={data.membersByGender} href={membersHref} />
      </section>

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Members"
          value={String(data.memberCount)}
          hint={scope}
          href={membersHref}
        />
        <StatCard
          label="Total Transactions"
          value={String(data.summary.successfulCount)}
          hint={`${data.summary.totalCount} recorded in range`}
          href={transactionsHref}
        />
        <StatCard
          label="Active Locations"
          value={String(data.activeLocations)}
          hint={data.selection.location ? "Selected campus" : "Across the organization"}
          href={locationsHref}
        />
        <StatCard
          label="Online Terminals"
          value={String(data.onlineTerminals)}
          hint={`${data.terminalCount} registered`}
          href="/admin/terminals"
        />
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
        hrefs={{
          giving: reportsHref,
          members: membersHref,
          transactions: transactionsHref,
        }}
      />

      <section aria-label="Activity" className="mt-6 grid gap-4 lg:grid-cols-2">
        <RecentTransactionsFeed
          transactions={data.recentGiving}
          empty={params.q ? "No matching transactions" : "No giving recorded yet"}
          viewAllHref={transactionsHref}
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
