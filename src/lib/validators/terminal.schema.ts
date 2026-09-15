import { z } from "zod";
import { MVP_CURRENCIES } from "@/types";

export const TERMINAL_STATUSES = ["ONLINE", "OFFLINE", "MAINTENANCE", "DISABLED"] as const;

export const TERMINAL_PAYMENT_METHODS = ["CASH", "CARD"] as const;

export const TERMINAL_CARD_CHANNELS = [
  "CBZ",
  "NBS",
  "ECOBANK",
  "ECOCASH",
  "ONEMONEY",
  "INNBUCKS",
] as const;

export type TerminalPaymentMethod = (typeof TERMINAL_PAYMENT_METHODS)[number];
export type TerminalCardChannel = (typeof TERMINAL_CARD_CHANNELS)[number];

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
  notes: z.string().trim().max(400, "Use a shorter note.").optional().or(z.literal("")),
});

function withCardChannelRules<T extends z.ZodType>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const data = value as {
      payment_method: TerminalPaymentMethod;
      card_channel?: TerminalCardChannel;
      receipt_code?: string;
    };
    if (data.payment_method === "CARD" && !data.card_channel) {
      ctx.addIssue({
        code: "custom",
        path: ["card_channel"],
        message: "Choose a card option.",
      });
    }
    if (data.card_channel === "CBZ" && !data.receipt_code?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["receipt_code"],
        message: "Enter the code from the CBZ receipt.",
      });
    }
  });
}

export const terminalPaymentSchema = withCardChannelRules(
  z.object({
    terminal_code: z.string().trim().min(3, "Unknown terminal."),
    giving_category_id: z.string().uuid("Select a giving category."),
    amount: terminalAmount,
    currency: z.enum(MVP_CURRENCIES),
    payment_method: z.enum(TERMINAL_PAYMENT_METHODS),
    card_channel: z.enum(TERMINAL_CARD_CHANNELS).optional(),
    receipt_code: z.string().trim().max(24).optional().or(z.literal("")),
    member_id: z.string().uuid().optional().or(z.literal("")),
    member_name: z.string().trim().max(80, "Use a shorter member name.").optional().or(z.literal("")),
    notes: z.string().trim().max(400, "Use a shorter note.").optional().or(z.literal("")),
  }),
);

export const terminalBatchPaymentSchema = withCardChannelRules(
  z.object({
    terminal_code: z.string().trim().min(3, "Unknown terminal."),
    payment_method: z.enum(TERMINAL_PAYMENT_METHODS),
    card_channel: z.enum(TERMINAL_CARD_CHANNELS).optional(),
    receipt_code: z.string().trim().max(24).optional().or(z.literal("")),
    member_id: z.string().uuid().optional().or(z.literal("")),
    member_name: z.string().trim().max(80, "Use a shorter member name.").optional().or(z.literal("")),
    items: z
      .array(terminalPaymentItemSchema)
      .min(1, "Add at least one gift.")
      .max(20, "This checkout can take up to 20 gifts."),
  }),
);

export const terminalMemberSearchSchema = z.object({
  terminal_code: z.string().trim().min(3, "Unknown terminal."),
  q: z.string().trim().min(2, "Enter at least two characters.").max(80),
});

export type TerminalInput = z.infer<typeof terminalSchema>;
export type TerminalPaymentInput = z.infer<typeof terminalPaymentSchema>;
export type TerminalBatchPaymentInput = z.infer<typeof terminalBatchPaymentSchema>;

export function isOtherGivingCategory(name: string | null | undefined) {
  return (name ?? "").trim().toLowerCase() === "other";
}

export function terminalCardChannelLabel(channel: string) {
  switch (channel) {
    case "ECOBANK":
      return "Ecobank";
    case "ECOCASH":
      return "EcoCash";
    case "ONEMONEY":
      return "OneMoney";
    case "INNBUCKS":
      return "InnBucks";
    default:
      return channel;
  }
}

export function storedTerminalPaymentMethod(
  method: TerminalPaymentMethod,
  channel?: string | null,
): "CASH" | "ECOCASH" | "ONEMONEY" | "CARD" | "BANK_TRANSFER" {
  if (method === "CASH") {
    return "CASH";
  }
  if (channel === "ECOCASH") {
    return "ECOCASH";
  }
  if (channel === "ONEMONEY") {
    return "ONEMONEY";
  }
  if (channel === "INNBUCKS") {
    return "BANK_TRANSFER";
  }
  return "CARD";
}

export function terminalPaymentDisplay(method: string, channel?: string | null) {
  if (channel) {
    return terminalCardChannelLabel(channel);
  }
  if (method === "CASH") {
    return "Cash";
  }
  if (method === "CARD") {
    return "Card";
  }
  return method.replace(/_/g, " ");
}

export type ParsedTerminalPaymentNotes = {
  channel: string | null;
  receiptCode: string | null;
  payer: string | null;
  note: string | null;
  simulated: boolean;
};

export function parseTerminalPaymentNotes(notes: string | null | undefined): ParsedTerminalPaymentNotes {
  const raw = (notes ?? "").trim();
  if (!raw) {
    return { channel: null, receiptCode: null, payer: null, note: null, simulated: false };
  }

  const channel = raw.match(/(?:^|\.\s*)Channel:\s*([^.]+)/)?.[1]?.trim() || null;
  const receiptCode = raw.match(/(?:^|\.\s*)Receipt code:\s*([^.]+)/)?.[1]?.trim() || null;
  const payer = raw.match(/Payer:\s*([^.]+)/)?.[1]?.trim() || null;
  const leftover = raw
    .replace(/Simulated terminal payment\.?\s*/i, "")
    .replace(/Payer:\s*[^.]+(?:\.|$)\s*/i, "")
    .replace(/(?:^|\.\s*)Channel:\s*[^.]+/g, "")
    .replace(/(?:^|\.\s*)Receipt code:\s*[^.]+/g, "")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .trim();

  return {
    channel,
    receiptCode,
    payer,
    note: leftover || null,
    simulated: /simulated terminal payment/i.test(raw),
  };
}
