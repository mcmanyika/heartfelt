import { MemberDepartmentsEditor } from "@/components/member/member-departments-editor";
import { PageHeader } from "@/components/ui/page-header";
import { getMyDepartments, listMyCampusDepartments } from "@/lib/services/department.service";

export default async function MemberDepartmentsPage() {
  const [{ departments }, campus] = await Promise.all([getMyDepartments(), listMyCampusDepartments()]);

  return (
    <>
      <PageHeader
        title="Departments"
        description="Join ministry teams at your campus. You can serve in more than one at a time."
      />

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <MemberDepartmentsEditor current={departments} available={campus.departments} />
      </section>
    </>
  );
}
