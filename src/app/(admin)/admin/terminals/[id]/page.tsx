import Link from "next/link";
import { notFound } from "next/navigation";
import { TerminalStatusButtons } from "@/components/admin/terminal-status-buttons";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import { getTerminal, listTerminalGiving } from "@/lib/services/terminal.service";
import { formatAmount, formatDateTime, paymentMethodLabel, terminalStatusLabel } from "@/lib/utils/format";

type TerminalDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TerminalDetailPage({ params }: TerminalDetailPageProps) {
  const current = await requireRole(STAFF_ROLES);
  const { id } = await params;
  const [{ terminal }, giving] = await Promise.all([getTerminal(id), listTerminalGiving(id)]);

  if (!terminal) {
    notFound();
  }

  const canMutate = current.isSuperAdmin || current.isLocationAdmin;
  const successful = giving.rows.filter((row) => row.status === "SUCCESS");

  return (
    <>
      <PageHeader
        title={terminal.device_name}
        description={`${terminal.location_name} (${terminal.location_code})`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/terminal/${terminal.terminal_code}`}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-navy"
              target="_blank"
            >
              Open simulator
            </Link>
            {canMutate ? (
              <Link
                href={`/admin/terminals/${terminal.id}/edit`}
                className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
              >
                Edit
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Terminal</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Code</dt>
              <dd className="text-navy">{terminal.terminal_code}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={terminal.status} label={terminalStatusLabel(terminal.status)} />
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Serial number</dt>
              <dd className="text-navy">{terminal.serial_number || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Software</dt>
              <dd className="text-navy">{terminal.software_version || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Last seen</dt>
              <dd className="text-navy">{formatDateTime(terminal.last_seen_at)}</dd>
            </div>
          </dl>
          {canMutate ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">Change status</p>
              <TerminalStatusButtons terminalId={terminal.id} status={terminal.status} />
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Recent simulated giving</h2>
          <p className="mt-4 text-3xl font-semibold text-navy">{successful.length}</p>
          <p className="mt-1 text-sm text-gray-500">Successful gifts on this device in the latest 20 records.</p>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-navy">Recent transactions</h2>
        <DataTable isEmpty={giving.rows.length === 0} emptyTitle="No terminal giving yet">
          <DataTableHead>
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {giving.rows.map((row) => (
              <tr key={row.id} className="text-navy">
                <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
                <td className="px-4 py-3 font-medium">{row.transaction_reference}</td>
                <td className="px-4 py-3">{row.category_name}</td>
                <td className="px-4 py-3">{formatAmount(row.amount, row.currency)}</td>
                <td className="px-4 py-3">{paymentMethodLabel(row.payment_method)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </section>
    </>
  );
}
