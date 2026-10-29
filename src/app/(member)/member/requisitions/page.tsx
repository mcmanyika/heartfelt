import { redirect } from "next/navigation";
import { RequisitionForm } from "@/components/member/requisition-form";
import { RequisitionList } from "@/components/member/requisition-list";
import { PageHeader } from "@/components/ui/page-header";
import {
  canAccessMemberRequisitions,
  listLedDepartmentsForRequisition,
  listMyRequisitions,
} from "@/lib/services/requisition.service";

export default async function MemberRequisitionsPage() {
  const access = await canAccessMemberRequisitions();
  if (!access.allowed) {
    redirect("/member/dashboard");
  }

  const [led, mine] = await Promise.all([
    listLedDepartmentsForRequisition(),
    listMyRequisitions(),
  ]);

  return (
    <>
      <PageHeader
        title="Requisitions"
        description="Department heads request funds · campus finance reviews"
      />

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-navy">Submit a request</h2>
        <p className="mt-1 text-sm text-gray-600">
          Only departments you lead appear here. Staff will approve or reject the request.
        </p>
        <div className="mt-4">
          <RequisitionForm departments={led.departments} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-navy">Your requisitions</h2>
        {mine.error ? (
          <p role="alert" className="mb-3 text-sm text-red-700">
            {mine.error}
          </p>
        ) : null}
        <RequisitionList rows={mine.rows} />
      </section>
    </>
  );
}
