"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { activateMemberRegistrationAction } from "@/lib/services/registration.actions";

type RegistrationActivateButtonProps = {
  memberId: string;
  memberName: string;
};

export function RegistrationActivateButton({
  memberId,
  memberName,
}: RegistrationActivateButtonProps) {
  return (
    <ConfirmDialog
      title="Activate account"
      message={`${memberName} will be able to sign in to the member portal.`}
      confirmLabel="Activate"
      triggerLabel="Activate"
      triggerClassName="rounded-lg bg-maroon px-3 py-2 text-sm font-semibold text-white"
      onConfirm={() => activateMemberRegistrationAction(memberId)}
    />
  );
}
