import Link from "next/link";
import { notFound } from "next/navigation";
import { DepartmentAddMemberForm } from "@/components/admin/department-add-member-form";
import { DepartmentDeleteButton } from "@/components/admin/department-delete-button";
import { DepartmentRemoveMemberButton } from "@/components/admin/department-remove-member-button";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/require-role";
import {
  canMutateDepartment,
  DEPARTMENT_ROLES,
  getDepartment,
  listDepartmentMembers,
} from "@/lib/services/department.service";
import { departmentMemberRoleLabel, formatDate } from "@/lib/utils/format";

type DepartmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DepartmentDetailPage({ params }: DepartmentDetailPageProps) {
  const current = await requireRole(DEPARTMENT_ROLES);
  const { id } = await params;
  const [{ department }, roster] = await Promise.all([getDepartment(id), listDepartmentMembers(id)]);

  if (!department) {
    notFound();
  }

  const canMutate = canMutateDepartment(current, department.location_id);

  return (
    <>
      <PageHeader
        title={department.name}
        description={`${department.location_name} (${department.location_code})${department.code ? ` · ${department.code}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {canMutate ? (
              <>
                <Link
                  href={`/admin/departments/${department.id}/edit`}
                  className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
                >
                  Edit
                </Link>
                <DepartmentDeleteButton departmentId={department.id} />
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Details</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge
                  status={department.status}
                  label={department.status === "ACTIVE" ? "Active" : "Inactive"}
                />
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Leader</dt>
              <dd className="text-navy">{department.leader_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Venue</dt>
              <dd className="text-navy">{department.venue || "—"}</dd>
            </div>
            {department.description ? (
              <div>
                <dt className="text-gray-500">Description</dt>
                <dd className="text-navy whitespace-pre-wrap">{department.description}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Add member</h2>
          <p className="mt-2 text-sm text-gray-600">
            Members can belong to several departments at once. Adding someone here does not remove them
            from other departments.
          </p>
          {canMutate ? (
            <div className="mt-4">
              <DepartmentAddMemberForm departmentId={department.id} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600">You can view this roster but not change it.</p>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-navy">Roster</h2>
        {roster.error ? (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {roster.error}
          </p>
        ) : null}
        <DataTable isEmpty={roster.rows.length === 0} emptyTitle="No members in this department yet">
          <DataTableHead>
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              {canMutate ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </DataTableHead>
          <DataTableBody>
            {roster.rows.map((row) => (
              <tr key={row.id} className="text-navy">
                <td className="px-4 py-3">
                  <Link href={`/admin/members/${row.member_id}`} className="font-medium hover:underline">
                    {row.member_name}
                  </Link>
                  <p className="text-xs text-gray-500">{row.membership_number}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.role} label={departmentMemberRoleLabel(row.role)} />
                </td>
                <td className="px-4 py-3">{formatDate(row.joined_at)}</td>
                {canMutate ? (
                  <td className="px-4 py-3">
                    <DepartmentRemoveMemberButton
                      departmentId={department.id}
                      membershipId={row.id}
                      memberName={row.member_name}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </section>
    </>
  );
}
