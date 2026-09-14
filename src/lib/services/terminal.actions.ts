"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createTerminal,
  setTerminalStatus,
  simulateTerminalPayment,
  updateTerminal,
} from "@/lib/services/terminal.service";
import type { TerminalStatus } from "@/types";

export async function createTerminalAction(input: unknown) {
  const result = await createTerminal(input);
  if (result.error || !result.id) {
    return { error: result.error ?? "Unable to create the terminal." };
  }

  revalidatePath("/admin/terminals");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/terminals/${result.id}`);
}

export async function updateTerminalAction(terminalId: string, input: unknown) {
  const result = await updateTerminal(terminalId, input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/terminals");
  revalidatePath(`/admin/terminals/${terminalId}`);
  revalidatePath("/admin/dashboard");
  redirect(`/admin/terminals/${terminalId}`);
}

export async function setTerminalStatusAction(terminalId: string, status: TerminalStatus) {
  const result = await setTerminalStatus(terminalId, status);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/terminals");
  revalidatePath(`/admin/terminals/${terminalId}`);
  revalidatePath("/admin/dashboard");
  return { ok: true as const };
}

export async function simulateTerminalPaymentAction(input: unknown) {
  const result = await simulateTerminalPayment(input);
  if (!result.error) {
    revalidatePath("/admin/transactions");
    revalidatePath("/admin/terminals");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/reports");
  }
  return result;
}
