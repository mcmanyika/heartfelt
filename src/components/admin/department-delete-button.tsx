"use client";

import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { deleteDepartmentAction } from "@/lib/services/department.actions";

export function DepartmentDeleteButton({ departmentId }: { departmentId: string }) {
  return (
    <DeleteRecordButton
      title="Delete this department"
      message="The roster for this department will be removed. Members stay in any other departments they belong to."
      onConfirm={() => deleteDepartmentAction(departmentId)}
    />
  );
}
