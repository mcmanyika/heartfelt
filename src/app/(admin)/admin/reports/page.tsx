import Link from "next/link";
import { ReportTable } from "@/components/admin/report-table";
import { GivingTrendChart } from "@/components/charts/dashboard-charts";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import { parseDashboardRange } from "@/lib/services/dashboard.service";
import { getStaffReport } from "@/lib/services/report.service";
import {
  formatAmount,
  formatDate,
  formatTotals,
  formatTotalsRecord,
  paymentMethodLabel,
  terminalStatusLabel,
} from "@/lib/utils/format";

type ReportsPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
};

export default async function AdminReportsPage({ searchParams }: ReportsPageProps) {
  const current = await requireRole(STAFF_ROLES);
  const params = await searchParams;
  const range = parseDashboardRange(params.from, params.to);
  const selection = await getAdminLocationSelection(current);
  const report = await getStaffReport({
    from: range.from,
    to: range.to,
    locationId: selection.locationId ?? undefined,
  });
  const currencies = report.summary.totals.map((total) => total.currency);
  const givingOverTime = Object.keys(report.summary.byMonth)
    .sort()
    .map((month) => ({
      month,
      ...report.summary.byMonth[month],
    }));
  const locationQuery = report.locationId ? `&location=${report.locationId}` : "";
  const transactionsHref = `/admin/transactions?from=${range.from}&to=${range.to}${locationQuery}`;
  const scope = selection.location
    ? `${selection.location.name} (${selection.location.code})`
    : "All campuses";
  const failedCount = Math.max(0, report.summary.totalCount - report.summary.successfulCount);
  const memberCount = report.membersByLocation.reduce((sum, row) => sum + row.members, 0);
  const showCampusStat = !report.locationId;
  const showCampusBreakdown = showCampusStat && report.summary.byLocation.length > 1;
  const givingValue =
    report.summary.totals.length === 0 ? (
      "—"
    ) : report.summary.totals.length === 1 ? (
      formatAmount(report.summary.totals[0].amount, report.summary.totals[0].currency)
    ) : (
      <span className="flex flex-col gap-1 text-lg leading-tight">
        {report.summary.totals.map((total) => (
          <span key={total.currency}>{formatAmount(total.amount, total.currency)}</span>
        ))}
      </span>
    );

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${scope} · ${formatDate(range.from)} – ${formatDate(range.to)}`}
        actions={
          <Link href={transactionsHref} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy">
            Open transactions
          </Link>
        }
      />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
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
        <button type="submit" className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white">
          Apply
        </button>
      </form>

      <section
        aria-label="Summary"
        className={`grid gap-4 sm:grid-cols-2 ${showCampusStat ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}
      >
        <StatCard label="Giving" value={givingValue} />
        <StatCard
          label="Successful gifts"
          value={String(report.summary.successfulCount)}
          hint={failedCount ? `${failedCount} unsuccessful` : "All gifts succeeded"}
        />
        <StatCard label="Members" value={String(memberCount)} hint={scope} />
        {showCampusStat ? (
          <StatCard
            label="Campuses"
            value={String(report.summary.byLocation.length)}
            hint="With giving in this range"
          />
        ) : null}
        <StatCard
          label="Active terminals"
          value={String(report.terminalActivity.filter((row) => row.status === "ONLINE").length)}
          hint={`${report.terminalActivity.length} registered`}
        />
      </section>

      <section className="mt-6" aria-label="Trend">
        <GivingTrendChart givingOverTime={givingOverTime} currencies={currencies} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2" aria-label="Breakdowns">
        {showCampusBreakdown ? (
          <ReportTable
            title="By campus"
            empty="No giving in this range"
            headers={["Campus", "Gifts", "Total"]}
            rows={report.summary.byLocation.map((row) => [
              `${row.name} (${row.code})`,
              String(row.count),
              formatTotals(
                Object.entries(row.totals).map(([currency, amount]) => ({ currency, amount })),
              ),
            ])}
          />
        ) : null}
        <ReportTable
          title="By category"
          empty="No giving in this range"
          headers={["Category", "Gifts", "Total"]}
          rows={report.summary.byCategory.map((row) => [
            row.name,
            String(row.count),
            formatTotals(
              Object.entries(row.totals).map(([currency, amount]) => ({ currency, amount })),
            ),
          ])}
        />
        <ReportTable
          title="By payment method"
          empty="No giving in this range"
          headers={["Method", "Gifts", "Total"]}
          rows={report.byMethod.map((row) => [
            paymentMethodLabel(row.label),
            String(row.count),
            formatTotalsRecord(row.totals),
          ])}
        />
        <ReportTable
          title="Terminals"
          empty="No terminals in this scope"
          headers={report.locationId ? ["Terminal", "Status", "Gifts"] : ["Terminal", "Campus", "Status", "Gifts"]}
          rows={report.terminalActivity.map((row) =>
            report.locationId
              ? [
                  row.device_name,
                  terminalStatusLabel(row.status),
                  row.transaction_count
                    ? `${row.transaction_count} · ${formatTotalsRecord(row.totals)}`
                    : "—",
                ]
              : [
                  row.device_name,
                  row.location_name,
                  terminalStatusLabel(row.status),
                  row.transaction_count
                    ? `${row.transaction_count} · ${formatTotalsRecord(row.totals)}`
                    : "—",
                ],
          )}
        />
      </section>
    </>
  );
}
