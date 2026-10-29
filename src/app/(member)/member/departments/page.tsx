import { DepartmentJoinRequests } from "@/components/member/department-join-requests";
import { MemberDepartmentsEditor } from "@/components/member/member-departments-editor";
import { PageHeader } from "@/components/ui/page-header";
import {
  getMyDepartments,
  listLedDepartmentJoinRequests,
  listMyCampusDepartments,
} from "@/lib/services/department.service";

export default async function MemberDepartmentsPage() {
  const [{ departments }, campus, led] = await Promise.all([
    getMyDepartments(),
    listMyCampusDepartments(),
    listLedDepartmentJoinRequests(),
  ]);

  return (
    <>
      <PageHeader title="Departments" />

      {led.requests.length > 0 ? (
        <div className="mb-6">
          <DepartmentJoinRequests requests={led.requests} />
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <MemberDepartmentsEditor current={departments} available={campus.departments} />
      </section>
    </>
  );
}
