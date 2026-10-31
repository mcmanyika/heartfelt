import { AdminNavTiles } from "@/components/admin/admin-nav-tiles";
import { DashboardFiltersButton } from "@/components/admin/dashboard-filters-button";
import { DashboardGauges } from "@/components/admin/dashboard-gauges";
import {
  GivingByMethodChart,
  MembersByGenderChart,
} from "@/components/charts/dashboard-charts";
import { ADMIN_NAV_ITEMS, isAdminHeaderNavItem } from "@/lib/auth/admin-nav";
import { hasAnyRole } from "@/lib/auth/permissions";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import {
  defaultDashboardRange,
  getDashboardData,
  parseDashboardRange,
} from "@/lib/services/dashboard.service";
import {
  filterNavItemsByAccess,
  getDisabledNavKeys,
} from "@/lib/services/nav-access.service";
import { paymentMethodLabel } from "@/lib/utils/format";

type DashboardPageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: DashboardPageProps) {
  const current = await requireRole(STAFF_ROLES);
  const params = await searchParams;
  const defaults = defaultDashboardRange();
  const range = parseDashboardRange(params.from, params.to);
  const isDefaultRange = range.from === defaults.from && range.to === defaults.to;
  const data = await getDashboardData(range);
  const isPlatformAdmin = isPlatformAdminEmail(current.email);
  const disabled = await getDisabledNavKeys(current.organizationId);
  const items = filterNavItemsByAccess(
    ADMIN_NAV_ITEMS.filter((item) => {
      if (
        item.href === "/admin/dashboard" ||
        item.href === "/admin/subscriptions" ||
        item.href === "/admin/menu" ||
        isAdminHeaderNavItem(item)
      ) {
        return false;
      }
      if (item.platformOnly && !isPlatformAdmin) {
        return false;
      }
      return hasAnyRole(current, item.roles);
    }),
    disabled.keys,
  );

  const giftsInRange = data.summary.successfulCount;
  const cashGifts = data.summary.byMethod.CASH ?? 0;
  const digitalGifts = Math.max(0, giftsInRange - cashGifts);
  const membersHref =
    current.isSuperAdmin || current.isLocationAdmin ? "/admin/members" : undefined;
  const primaryCurrency =
    data.summary.totals.slice().sort((a, b) => b.amount - a.amount)[0]?.currency ?? null;
  const givingByMethod = primaryCurrency
    ? Object.entries(data.summary.byMethodTotals)
        .map(([name, totals]) => ({
          name: paymentMethodLabel(name),
          value: totals[primaryCurrency] ?? 0,
        }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-3 flex justify-end">
        <DashboardFiltersButton
          from={range.from}
          to={range.to}
          isDefaultRange={isDefaultRange}
        />
      </div>

      <DashboardGauges
        onlineTerminals={data.onlineTerminals}
        terminalCount={data.terminalCount}
        terminals={data.terminals}
        digitalGifts={digitalGifts}
        giftsInRange={giftsInRange}
        byMethod={Object.entries(data.summary.byMethod)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)}
        activeLocations={data.activeLocations}
        locationCount={data.locationCount}
        locations={data.locations}
      />

      <section aria-label="Breakdown charts" className="mb-4 grid gap-3 md:grid-cols-2">
        <MembersByGenderChart
          membersByGender={data.membersByGender}
          href={membersHref}
          animationDelayMs={240}
        />
        <GivingByMethodChart
          byMethod={givingByMethod}
          href="/admin/transactions"
          animationDelayMs={320}
          currency={primaryCurrency ?? undefined}
        />
      </section>

      <AdminNavTiles items={[...items]} />
    </div>
  );
}
