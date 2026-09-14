"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deactivateMemberAction } from "@/lib/services/member.actions";

type MemberDeactivateButtonProps = {
  memberId: string;
  memberName: string;
};

export function MemberDeactivateButton({
  memberId,
  memberName,
}: MemberDeactivateButtonProps) {
  return (
    <ConfirmDialog
      title="Deactivate member"
      message={`${memberName} will be marked inactive. Their giving history is kept.`}
      confirmLabel="Deactivate"
      triggerLabel="Deactivate"
      onConfirm={() => deactivateMemberAction(memberId)}
    />
  );
}
