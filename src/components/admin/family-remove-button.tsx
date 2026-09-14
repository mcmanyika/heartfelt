"use client";

import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { removeFamilyLinkAction } from "@/lib/services/family.actions";

type FamilyRemoveButtonProps = {
  memberId: string;
  linkId: string;
  relatedName: string;
};

export function FamilyRemoveButton({ memberId, linkId, relatedName }: FamilyRemoveButtonProps) {
  return (
    <DeleteRecordButton
      title="Remove this family connection"
      message={`${relatedName} will no longer appear as a family member on this record.`}
      confirmLabel="Remove"
      triggerLabel="Remove"
      onConfirm={() => removeFamilyLinkAction(memberId, linkId)}
    />
  );
}
