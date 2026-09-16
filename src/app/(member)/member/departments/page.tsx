import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getMyDepartments } from "@/lib/services/department.service";
import { departmentMemberRoleLabel } from "@/lib/utils/format";

export default async function MemberDepartmentsPage() {
  const { departments } = await getMyDepartments();

  return (
    <>
      <PageHeader
        title="Departments"
        description="Ministry teams you belong to. You can serve in more than one at a time."
      />

      {departments.length === 0 ? (
        <EmptyState
          title="No departments assigned"
          description="Ask your campus office to place you in a department."
        />
      ) : (
        <ul className="space-y-4">
          {departments.map((department) => (
            <li key={department.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-navy">{department.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">{department.venue || "Venue not set"}</p>
                </div>
                <StatusBadge status={department.role} label={departmentMemberRoleLabel(department.role)} />
              </div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Leader</dt>
                  <dd className="text-navy">{department.leader_name || "—"}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
