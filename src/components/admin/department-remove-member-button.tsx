"use client";

import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { removeDepartmentMemberAction } from "@/lib/services/department.actions";

type DepartmentRemoveMemberButtonProps = {
  departmentId: string;
  membershipId: string;
  memberName: string;
};

export function DepartmentRemoveMemberButton({
  departmentId,
  membershipId,
  memberName,
}: DepartmentRemoveMemberButtonProps) {
  return (
    <DeleteRecordButton
      title="Remove this member"
      message={`${memberName} will leave this department. They remain in any other departments they belong to.`}
      confirmLabel="Remove"
      triggerLabel="Remove"
      onConfirm={() => removeDepartmentMemberAction(departmentId, membershipId)}
    />
  );
}
