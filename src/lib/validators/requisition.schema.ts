import { z } from "zod";
import { MVP_CURRENCIES } from "@/types";

export const REQUISITION_STATUSES = [
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export const requisitionSchema = z.object({
  department_id: z.string().uuid("Select a department."),
  amount: z
    .string()
    .trim()
    .min(1, "Enter an amount.")
    .refine((value) => Number(value) > 0, "Amount must be greater than zero.")
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Use up to 2 decimal places."),
  currency: z.enum(MVP_CURRENCIES),
  purpose: z
    .string()
    .trim()
    .min(3, "Describe what the funds are for.")
    .max(500, "Keep the purpose under 500 characters."),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const requisitionDecisionSchema = z.object({
  requisition_id: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  decision_notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type RequisitionInput = z.infer<typeof requisitionSchema>;
export type RequisitionDecisionInput = z.infer<typeof requisitionDecisionSchema>;
