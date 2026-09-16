import { notFound, redirect } from "next/navigation";
import { DepartmentForm } from "@/components/forms/department-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { canMutateDepartment, DEPARTMENT_ROLES, getDepartment } from "@/lib/services/department.service";
import { createClient } from "@/lib/supabase/server";

type EditDepartmentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDepartmentPage({ params }: EditDepartmentPageProps) {
  const current = await requireRole(DEPARTMENT_ROLES);
  const { id } = await params;
  const result = await getDepartment(id);

  if (!result.department) {
    notFound();
  }

  const department = result.department;
  if (!canMutateDepartment(current, department.location_id)) {
    redirect(`/admin/departments/${department.id}`);
  }

  let initialLeader = null;
  if (department.leader_member_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("members")
      .select("id, first_name, last_name, membership_number")
      .eq("id", department.leader_member_id)
      .eq("organization_id", current.organizationId)
      .maybeSingle();
    initialLeader = data as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      membership_number: string;
    } | null;
  }

  return (
    <>
      <PageHeader
        title={`Edit ${department.name}`}
        description="Organization is never taken from the form. Location Admins stay on their campus."
      />
      <DepartmentForm
        departmentId={department.id}
        lockLocation={!current.isSuperAdmin}
        locations={current.accessibleLocations.map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
        }))}
        initialLeader={initialLeader}
        defaultValues={{
          location_id: department.location_id,
          name: department.name,
          code: department.code ?? "",
          description: department.description ?? "",
          venue: department.venue ?? "",
          leader_member_id: department.leader_member_id ?? "",
          status: department.status,
        }}
      />
    </>
  );
}
