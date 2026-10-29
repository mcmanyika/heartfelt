import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { requireRole } from "@/lib/auth/require-role";
import { getPersonalAffiliateDashboard } from "@/lib/services/affiliate.service";
import { PRODUCT_NAME } from "@/lib/tenant/config";
import { formatDate, formatDateTime } from "@/lib/utils/format";

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function commissionStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "APPROVED":
      return "Approved";
    case "PAID":
      return "Paid";
    case "VOID":
      return "Void";
    default:
      return status;
  }
}

export default async function MemberReferralsPage() {
  await requireRole("MEMBER");
  const data = await getPersonalAffiliateDashboard();

  return (
    <>
      <PageHeader
        title="Referrals"
        description={`Support our product by way of marketing. When a church signs up and pays setup, you earn ${data.splitRatePercent}% and your church earns ${data.splitRatePercent}% (of setup fees).`}
      />

      {data.error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {data.error}
        </p>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-md border border-border bg-card p-4">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Pending</p>
          <p className="mt-2 text-xl font-semibold text-navy">{formatMoney(data.pendingCents)}</p>
        </article>
        <article className="rounded-md border border-border bg-card p-4">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Paid out</p>
          <p className="mt-2 text-xl font-semibold text-navy">{formatMoney(data.paidCents)}</p>
        </article>
        <article className="rounded-md border border-border bg-card p-4">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Referrals</p>
          <p className="mt-2 text-xl font-semibold text-navy">{data.referrals.length}</p>
        </article>
      </section>

      <section className="mb-6 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-navy">Your personal referral link</h2>
        <p className="mt-1 text-sm text-gray-600">
          Anyone can use this link to start a church on {PRODUCT_NAME}.
        </p>
        <div className="mt-3 space-y-2">
          <p className="break-all rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-navy">
            {data.shareUrl || "—"}
          </p>
          <p className="text-xs text-gray-500">
            Code: <span className="font-semibold text-navy">{data.referralCode || "—"}</span>
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-navy">Churches you referred</h2>
        <DataTable isEmpty={data.referrals.length === 0} emptyTitle="No referred churches yet">
          <DataTableHead>
            <tr>
              <th className="px-4 py-3">Church</th>
              <th className="px-4 py-3">Signed up</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {data.referrals.map((row) => (
              <tr key={row.referredOrganizationId} className="text-navy">
                <td className="px-4 py-3 font-medium">{row.referredOrganizationName}</td>
                <td className="px-4 py-3">{formatDate(row.createdAt.slice(0, 10))}</td>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-navy">Your commissions</h2>
        <DataTable isEmpty={data.commissions.length === 0} emptyTitle="No commissions yet">
          <DataTableHead>
            <tr>
              <th className="px-4 py-3">Church</th>
              <th className="px-4 py-3">Setup</th>
              <th className="px-4 py-3">Your share</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {data.commissions.map((row) => (
              <tr key={row.id} className="text-navy">
                <td className="px-4 py-3 font-medium">{row.referredOrganizationName}</td>
                <td className="px-4 py-3">{formatMoney(row.setupCents, row.currency)}</td>
                <td className="px-4 py-3 font-medium">
                  {formatMoney(row.commissionCents, row.currency)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} label={commissionStatusLabel(row.status)} />
                </td>
                <td className="px-4 py-3">{formatDateTime(row.createdAt)}</td>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </section>
    </>
  );
}
