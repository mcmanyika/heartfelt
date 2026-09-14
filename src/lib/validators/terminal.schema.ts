import { z } from "zod";
import { MVP_CURRENCIES } from "@/types";

export const TERMINAL_STATUSES = ["ONLINE", "OFFLINE", "MAINTENANCE", "DISABLED"] as const;

export const TERMINAL_PAYMENT_METHODS = ["CASH", "ECOCASH", "ONEMONEY", "CARD"] as const;

export const TERMINAL_SOFTWARE_VERSION = "0.1.0-mvp";

export const terminalSchema = z.object({
  location_id: z.string().uuid("Select a location.").optional().or(z.literal("")),
  terminal_code: z
    .string()
    .trim()
    .max(32)
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => !value || /^[A-Z0-9][A-Z0-9-]{2,31}$/i.test(value),
      "Use a code like HIM-HRE-T001.",
    ),
  device_name: z.string().trim().min(2, "Enter a device name.").max(80),
  serial_number: z.string().trim().max(80).optional().or(z.literal("")),
  status: z.enum(TERMINAL_STATUSES),
  software_version: z.string().trim().max(40).optional().or(z.literal("")),
});

const terminalAmount = z
  .string()
  .trim()
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0, "Enter a valid amount.");

export const terminalPaymentItemSchema = z.object({
  giving_category_id: z.string().uuid("Select a giving category."),
  amount: terminalAmount,
  currency: z.enum(MVP_CURRENCIES),
});

export const terminalPaymentSchema = z.object({
  terminal_code: z.string().trim().min(3, "Unknown terminal."),
  giving_category_id: z.string().uuid("Select a giving category."),
  amount: terminalAmount,
  currency: z.enum(MVP_CURRENCIES),
  payment_method: z.enum(TERMINAL_PAYMENT_METHODS),
  member_id: z.string().uuid().optional().or(z.literal("")),
  member_name: z.string().trim().max(80, "Use a shorter member name.").optional().or(z.literal("")),
});

export const terminalBatchPaymentSchema = z.object({
  terminal_code: z.string().trim().min(3, "Unknown terminal."),
  payment_method: z.enum(TERMINAL_PAYMENT_METHODS),
  member_id: z.string().uuid().optional().or(z.literal("")),
  member_name: z.string().trim().max(80, "Use a shorter member name.").optional().or(z.literal("")),
  items: z
    .array(terminalPaymentItemSchema)
    .min(1, "Add at least one gift.")
    .max(20, "This checkout can take up to 20 gifts."),
});

export const terminalMemberSearchSchema = z.object({
  terminal_code: z.string().trim().min(3, "Unknown terminal."),
  q: z.string().trim().min(2, "Enter at least two characters.").max(80),
});

export type TerminalInput = z.infer<typeof terminalSchema>;
export type TerminalPaymentInput = z.infer<typeof terminalPaymentSchema>;
export type TerminalBatchPaymentInput = z.infer<typeof terminalBatchPaymentSchema>;
