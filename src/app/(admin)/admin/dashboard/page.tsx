import { AdminNavTiles } from "@/components/admin/admin-nav-tiles";
import {
  GivingByMethodChart,
  MembersByGenderChart,
} from "@/components/charts/dashboard-charts";
import { SpeedometerGauge } from "@/components/charts/speedometer-gauge";
import { ADMIN_NAV_ITEMS, isAdminHeaderNavItem } from "@/lib/auth/admin-nav";
import { hasAnyRole } from "@/lib/auth/permissions";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import {
  defaultDashboardRange,
  getDashboardData,
} from "@/lib/services/dashboard.service";
import { paymentMethodLabel } from "@/lib/utils/format";

export default async function AdminDashboardPage() {
  const current = await requireRole(STAFF_ROLES);
  const data = await getDashboardData(defaultDashboardRange());
  const items = ADMIN_NAV_ITEMS.filter((item) => {
    if (
      item.href === "/admin/dashboard" ||
      item.href === "/admin/subscriptions" ||
      isAdminHeaderNavItem(item)
    ) {
      return false;
    }
    if (item.platformOnly && !isPlatformAdminEmail(current.email)) {
      return false;
    }
    return hasAnyRole(current, item.roles);
  });

  const giftsYtd = data.summary.successfulCount;
  const cashGifts = data.summary.byMethod.CASH ?? 0;
  const digitalGifts = Math.max(0, giftsYtd - cashGifts);
  const membersHref =
    current.isSuperAdmin || current.isLocationAdmin ? "/admin/members" : undefined;

  return (
    <div className="mx-auto max-w-7xl">
      <section
        aria-label="Performance gauges"
        className="mb-8 grid gap-4 sm:grid-cols-3"
      >
        <SpeedometerGauge
          label="Terminals online"
          value={data.onlineTerminals}
          max={data.terminalCount}
          animationDelayMs={0}
          detail={
            data.terminalCount === 0
              ? "No terminals registered"
              : `${data.onlineTerminals} of ${data.terminalCount} online`
          }
        />
        <SpeedometerGauge
          label="Digital giving"
          value={digitalGifts}
          max={giftsYtd}
          animationDelayMs={90}
          detail={
            giftsYtd === 0
              ? "No gifts recorded this year"
              : `${digitalGifts} of ${giftsYtd} non-cash`
          }
        />
        <SpeedometerGauge
          label="Locations active"
          value={data.activeLocations}
          max={data.locationCount}
          animationDelayMs={180}
          detail={
            data.locationCount === 0
              ? "No locations in scope"
              : `${data.activeLocations} of ${data.locationCount} active`
          }
        />
      </section>

      <section aria-label="Breakdown charts" className="mb-8 grid gap-4 md:grid-cols-2">
        <MembersByGenderChart
          membersByGender={data.membersByGender}
          href={membersHref}
          animationDelayMs={240}
        />
        <GivingByMethodChart
          byMethod={Object.entries(data.summary.byMethod).map(([name, value]) => ({
            name: paymentMethodLabel(name),
            value,
          }))}
          href="/admin/transactions"
          animationDelayMs={320}
        />
      </section>

      <AdminNavTiles items={[...items]} />
    </div>
  );
}
