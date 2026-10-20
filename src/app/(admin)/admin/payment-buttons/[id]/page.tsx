import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentButtonEmbedCopy } from "@/components/admin/payment-button-embed-copy";
import { PaymentButtonStatusButton } from "@/components/admin/payment-button-status-button";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { hasAnyRole } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import {
  getPaymentButton,
  listPaymentButtonGiving,
  PAYMENT_BUTTON_MUTATE_ROLES,
} from "@/lib/services/payment-button.service";
import { formatAmount, formatDateTime } from "@/lib/utils/format";

type PaymentButtonDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PaymentButtonDetailPage({ params }: PaymentButtonDetailPageProps) {
  const current = await requireRole(STAFF_ROLES);
  const { id } = await params;
  const [{ button }, giving] = await Promise.all([getPaymentButton(id), listPaymentButtonGiving(id)]);

  if (!button) {
    notFound();
  }

  const canMutate = hasAnyRole(current, PAYMENT_BUTTON_MUTATE_ROLES);
  const successful = giving.rows.filter((row) => row.status === "SUCCESS");

  return (
    <>
      <PageHeader
        title={button.name}
        description={`${button.location_name} (${button.location_code}) · ${button.category_name}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={button.public_url}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-navy"
              target="_blank"
            >
              Open public page
            </Link>
            {canMutate ? (
              <>
                <PaymentButtonStatusButton buttonId={button.id} active={button.active} />
                <Link
                  href={`/admin/payment-buttons/${button.id}/edit`}
                  className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
                >
                  Edit
                </Link>
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Button</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Label</dt>
              <dd className="text-navy">{button.button_label}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Amount</dt>
              <dd className="text-navy">
                {button.amount_mode === "FIXED" && button.amount !== null
                  ? formatAmount(button.amount, button.currency)
                  : `Open · ${button.currency}`}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={button.active ? "ACTIVE" : "INACTIVE"} />
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Success message</dt>
              <dd className="text-navy">{button.success_message || "—"}</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm text-gray-600">{successful.length} successful gifts in the latest 20 records.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Embed on your website</h2>
          <p className="mt-1 mb-4 text-sm text-gray-600">
            Copy a link or iframe onto WordPress, Wix, or any external site.
          </p>
          <PaymentButtonEmbedCopy
            publicUrl={button.public_url}
            linkSnippet={button.link_snippet}
            iframeSnippet={button.iframe_snippet}
          />
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-navy">Recent gifts</h2>
        <DataTable isEmpty={giving.rows.length === 0} emptyTitle="No gifts from this button yet">
          <DataTableHead>
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {giving.rows.map((row) => (
              <tr key={row.id} className="text-navy">
                <td className="px-4 py-3">{formatDateTime(String(row.created_at))}</td>
                <td className="px-4 py-3 font-medium">{row.transaction_reference}</td>
                <td className="px-4 py-3">{row.category_name}</td>
                <td className="px-4 py-3">{formatAmount(Number(row.amount), String(row.currency))}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={String(row.status)} />
                </td>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </section>
    </>
  );
}
