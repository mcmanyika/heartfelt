import { RegistrationActivateButton } from "@/components/admin/registration-activate-button";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { withQuery } from "@/lib/admin/query-string";
import { requireRole } from "@/lib/auth/require-role";
import { listPendingRegistrations } from "@/lib/services/registration.service";
import { formatDateTime } from "@/lib/utils/format";

type RegistrationsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminRegistrationsPage({ searchParams }: RegistrationsPageProps) {
  await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const params = await searchParams;
  const result = await listPendingRegistrations({
    page: Number(params.page ?? "1") || 1,
  });

  return (
    <>
      <PageHeader title="Registrations" />

      {result.error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <DataTable isEmpty={result.rows.length === 0} emptyTitle="No pending registrations">
        <DataTableHead>
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Campus</th>
            <th className="px-4 py-3">Membership</th>
            <th className="px-4 py-3">Submitted</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.rows.map((row) => {
            const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "Unnamed";
            return (
              <tr key={row.id} className="text-navy">
                <td className="px-4 py-3 font-medium">{name}</td>
                <td className="px-4 py-3">{row.email || "—"}</td>
                <td className="px-4 py-3">
                  {row.location_name} ({row.location_code})
                </td>
                <td className="px-4 py-3">{row.membership_number}</td>
                <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
                <td className="px-4 py-3">
                  <RegistrationActivateButton memberId={row.id} memberName={name} />
                </td>
              </tr>
            );
          })}
        </DataTableBody>
      </DataTable>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        hrefForPage={(page) => withQuery("/admin/registrations", {}, { page: String(page) })}
      />
    </>
  );
}
