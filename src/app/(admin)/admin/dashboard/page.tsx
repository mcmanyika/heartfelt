import Link from "next/link";
import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { getDashboardData, parseDashboardRange } from "@/lib/services/dashboard.service";
import { formatAmount, formatDate, formatDateTime, formatTotals, paymentMethodLabel, terminalStatusLabel } from "@/lib/utils/format";
import { TERMINAL_STATUSES } from "@/lib/validators/terminal.schema";
import type { TerminalStatus } from "@/types";

type DashboardPageProps = {
  searchParams: Promise<{ from?: string; to?: string; q?: string; terminal_status?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const range = parseDashboardRange(params.from, params.to);
  const data = await getDashboardData(range, {
    q: params.q,
    terminalStatus: params.terminal_status,
  });
  const scope = data.selection.location
    ? `${data.selection.location.name} (${data.selection.location.code})`
    : "all locations";
  const terminalStatus = TERMINAL_STATUSES.includes(params.terminal_status as TerminalStatus)
    ? (params.terminal_status as TerminalStatus)
    : "";
  const currencies = data.summary.totals.map((total) => total.currency);
  const givingOverTime = Object.keys(data.summary.byMonth)
    .sort()
    .map((month) => ({
      month,
      ...data.summary.byMonth[month],
    }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Overview for ${scope}. Location follows the header selector. Amounts stay in their original currency.`}
        actions={
          <Link
            href={`/admin/reports?from=${range.from}&to=${range.to}`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy"
          >
            View reports
          </Link>
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <SearchInput defaultValue={params.q} placeholder="Search listings" />
        <select
          name="terminal_status"
          defaultValue={terminalStatus}
          className={fieldClassName}
          aria-label="Filter terminals by status"
        >
          <option value="">All terminal statuses</option>
          {TERMINAL_STATUSES.map((value) => (
            <option key={value} value={value}>
              {terminalStatusLabel(value)}
            </option>
          ))}
        </select>
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
        <div className="md:col-span-4">
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </div>
      </form>

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Members" value={String(data.memberCount)} hint={scope} />
        <StatCard
          label="Total Giving"
          value={
            data.summary.totals.length === 1
              ? formatAmount(data.summary.totals[0].amount, data.summary.totals[0].currency)
              : data.summary.totals.length
                ? `${data.summary.totals.length} currencies`
                : "—"
          }
          hint={formatTotals(data.summary.totals)}
        />
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
          }))}
        />
        <FeedCard
          title="Terminal Status"
          href="/admin/terminals"
          empty={params.q || terminalStatus ? "No matching terminals" : "No terminals yet"}
          items={data.terminals.map((terminal) => {
            const location = Array.isArray(terminal.locations)
              ? terminal.locations[0]
              : terminal.locations;
            return {
              id: terminal.id,
              title: terminal.device_name,
              meta: `${terminal.terminal_code}${location ? ` · ${location.name}` : ""}`,
              extra: terminal.status,
              status: terminal.status,
            };
          })}
        />
        <FeedCard
          title="Upcoming Events"
          href={data.current.isSuperAdmin || data.current.isLocationAdmin ? "/admin/events" : undefined}
          empty={params.q ? "No matching events" : "No upcoming events"}
          items={data.events.map((event) => ({
            id: event.id,
            title: event.title,
            meta: event.location_name ?? "All locations",
            extra: formatDateTime(event.start_date),
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
  items: Array<{ id: string; title: string; meta: string; extra: string; status?: string }>;
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
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-navy">{item.title}</p>
                <p className="text-xs text-gray-500">{item.meta}</p>
                {item.status ? null : <p className="text-xs text-gray-500">{item.extra}</p>}
              </div>
              {item.status ? <StatusBadge status={item.status} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
