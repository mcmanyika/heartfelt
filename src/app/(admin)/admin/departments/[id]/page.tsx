import Link from "next/link";
import { notFound } from "next/navigation";
import { DepartmentAddMemberForm } from "@/components/admin/department-add-member-form";
import { DepartmentDeleteButton } from "@/components/admin/department-delete-button";
import { DepartmentMembershipActions } from "@/components/admin/department-membership-actions";
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
import {
  departmentMemberRoleLabel,
  departmentMembershipStatusLabel,
  formatDate,
} from "@/lib/utils/format";

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
  const pending = roster.rows.filter((row) => row.status === "PENDING");
  const active = roster.rows.filter((row) => row.status === "ACTIVE");

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
            Staff adds are confirmed immediately. Member self-requests stay pending until confirmed.
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

      {pending.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-navy">Pending requests</h2>
          <DataTable isEmpty={false} emptyTitle="No pending requests">
            <DataTableHead>
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Requested</th>
                {canMutate ? <th className="px-4 py-3">Actions</th> : null}
              </tr>
            </DataTableHead>
            <DataTableBody>
              {pending.map((row) => (
                <tr key={row.id} className="text-navy">
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${row.member_id}`} className="font-medium hover:underline">
                      {row.member_name}
                    </Link>
                    <p className="text-xs text-gray-500">{row.membership_number}</p>
                  </td>
                  <td className="px-4 py-3">{formatDate(row.joined_at)}</td>
                  {canMutate ? (
                    <td className="px-4 py-3">
                      <DepartmentMembershipActions membershipId={row.id} memberName={row.member_name} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-navy">Roster</h2>
        {roster.error ? (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {roster.error}
          </p>
        ) : null}
        <DataTable isEmpty={active.length === 0} emptyTitle="No confirmed members yet">
          <DataTableHead>
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              {canMutate ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </DataTableHead>
          <DataTableBody>
            {active.map((row) => (
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
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} label={departmentMembershipStatusLabel(row.status)} />
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
