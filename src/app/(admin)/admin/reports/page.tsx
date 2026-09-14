import Link from "next/link";
import { ReportTable } from "@/components/admin/report-table";
import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import { parseDashboardRange } from "@/lib/services/dashboard.service";
import { getStaffReport } from "@/lib/services/report.service";
import {
  formatDate,
  formatDateTime,
  formatTotals,
  formatTotalsRecord,
  paymentMethodLabel,
  terminalStatusLabel,
} from "@/lib/utils/format";

type ReportsPageProps = {
  searchParams: Promise<{
    location?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function AdminReportsPage({ searchParams }: ReportsPageProps) {
  await requireRole(STAFF_ROLES);
  const params = await searchParams;
  const range = parseDashboardRange(params.from, params.to);
  const report = await getStaffReport({
    from: range.from,
    to: range.to,
    locationId: params.location,
  });
  const currencies = report.summary.totals.map((total) => total.currency);
  const givingOverTime = Object.keys(report.summary.byMonth)
    .sort()
    .map((month) => ({
      month,
      ...report.summary.byMonth[month],
    }));
  const transactionsHref = `/admin/transactions?from=${range.from}&to=${range.to}${
    report.locationId ? `&location=${report.locationId}` : ""
  }`;

  return (
    <>
      <PageHeader
        title="Reports"
        actions={
          <Link href={transactionsHref} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy">
            Open transactions
          </Link>
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        {report.current.isSuperAdmin ? (
          <select
            name="location"
            defaultValue={params.location ?? report.locationId ?? ""}
            className={fieldClassName}
            aria-label="Compare by location"
          >
            <option value="">All locations</option>
            {report.current.accessibleLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.code})
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="date"
          name="from"
          defaultValue={range.from}
          className={fieldClassName}
          aria-label="From date"
        />
        <input type="date" name="to" defaultValue={range.to} className={fieldClassName} aria-label="To date" />
        <div className={report.current.isSuperAdmin ? "" : "md:col-span-2"}>
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </div>
      </form>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <ReportStat label="Successful transactions" value={String(report.summary.successfulCount)} />
        <ReportStat label="All recorded" value={String(report.summary.totalCount)} />
        <ReportStat label="Totals" value={formatTotals(report.summary.totals)} />
      </section>

      <DashboardCharts
        givingOverTime={givingOverTime}
        currencies={currencies}
        byCategory={report.summary.byCategory.map((row) => ({ name: row.name, count: row.count }))}
        byMethod={report.byMethod.map((row) => ({
          name: paymentMethodLabel(row.label),
          value: row.count,
        }))}
        membersByLocation={report.membersByLocation.map((row) => ({
          name: `${row.name} (${row.code})`,
          members: row.members,
        }))}
      />

      <div className="mt-8 space-y-8">
        <ReportTable
          title="Members by location"
          empty="No members in this scope"
          headers={["Location", "Members"]}
          rows={report.membersByLocation.map((row) => [`${row.name} (${row.code})`, String(row.members)])}
        />
        <ReportTable
          title="Giving by location"
          empty="No giving in this range"
          headers={["Location", "Transactions", "Totals"]}
          rows={report.summary.byLocation.map((row) => [
            `${row.name} (${row.code})`,
            String(row.count),
            formatTotals(
              Object.entries(row.totals).map(([currency, amount]) => ({ currency, amount })),
            ),
          ])}
        />
        <ReportTable
          title="Giving by category"
          empty="No giving in this range"
          headers={["Category", "Transactions", "Totals"]}
          rows={report.summary.byCategory.map((row) => [
            row.name,
            String(row.count),
            formatTotals(
              Object.entries(row.totals).map(([currency, amount]) => ({ currency, amount })),
            ),
          ])}
        />
        <ReportTable
          title="Giving by payment method"
          empty="No giving in this range"
          headers={["Payment method", "Transactions", "Totals"]}
          rows={report.byMethod.map((row) => [
            paymentMethodLabel(row.label),
            String(row.count),
            formatTotalsRecord(row.totals),
          ])}
        />
        <ReportTable
          title="Giving by currency"
          empty="No giving in this range"
          headers={["Currency", "Transactions", "Totals"]}
          rows={report.byCurrency.map((row) => [row.label, String(row.count), formatTotalsRecord(row.totals)])}
        />
        <ReportTable
          title="Transactions by date"
          empty="No giving in this range"
          headers={["Date", "Transactions", "Totals"]}
          rows={report.byDate.map((row) => [formatDate(row.label), String(row.count), formatTotalsRecord(row.totals)])}
        />
        <ReportTable
          title="Giving by month"
          empty="No giving in this range"
          headers={["Month", "Totals"]}
          rows={Object.keys(report.summary.byMonth)
            .sort()
            .map((month) => [
              month,
              formatTotals(
                Object.entries(report.summary.byMonth[month]).map(([currency, amount]) => ({
                  currency,
                  amount,
                })),
              ),
            ])}
        />
        <ReportTable
          title="Terminal activity"
          empty="No terminals in this scope"
          headers={["Terminal", "Campus", "Status", "Last seen", "Transactions", "Totals"]}
          rows={report.terminalActivity.map((row) => [
            `${row.device_name} (${row.terminal_code})`,
            row.location_name,
            terminalStatusLabel(row.status),
            formatDateTime(row.last_seen_at),
            String(row.transaction_count),
            formatTotalsRecord(row.totals),
          ])}
        />
      </div>
    </>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</p>
      <p className="mt-3 text-xl font-semibold tracking-tight text-navy">{value}</p>
    </article>
  );
}
