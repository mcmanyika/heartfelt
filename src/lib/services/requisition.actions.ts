"use server";

import { revalidatePath } from "next/cache";
import {
  cancelMyRequisition,
  decideRequisition,
  submitRequisition,
} from "@/lib/services/requisition.service";

function revalidateRequisitionPaths() {
  revalidatePath("/member/requisitions");
  revalidatePath("/member/departments");
  revalidatePath("/member/dashboard");
  revalidatePath("/admin/requisitions");
  revalidatePath("/admin/audit");
}

export async function submitRequisitionAction(input: unknown) {
  const result = await submitRequisition(input);
  if (result.error) {
    return { error: result.error };
  }

  revalidateRequisitionPaths();
  return { ok: true as const };
}

export async function cancelMyRequisitionAction(requisitionId: string) {
  const result = await cancelMyRequisition(requisitionId);
  if (result.error) {
    return { error: result.error };
  }

  revalidateRequisitionPaths();
  return { ok: true as const };
}

export async function decideRequisitionAction(input: unknown) {
  const result = await decideRequisition(input);
  if (result.error) {
    return { error: result.error };
  }

  revalidateRequisitionPaths();
  return { ok: true as const };
}
