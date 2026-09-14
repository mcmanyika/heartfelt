import { z } from "zod";
import { MVP_CURRENCIES } from "@/types";

export const MANUAL_PAYMENT_METHODS = [
  "CASH",
  "ECOCASH",
  "ONEMONEY",
  "CARD",
  "BANK_TRANSFER",
] as const;

export const TRANSACTION_STATUSES = [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
] as const;

export const givingCategorySchema = z.object({
  name: z.string().trim().min(2, "Enter a category name.").max(80),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  active: z.boolean(),
});

export const givingTransactionSchema = z
  .object({
    anonymous: z.boolean(),
    member_id: z.string().uuid("Select a member.").optional().or(z.literal("")),
    location_id: z.string().uuid("Select a location.").optional().or(z.literal("")),
    giving_category_id: z.string().uuid("Select a giving category."),
    amount: z
      .string()
      .trim()
      .refine((value) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0, "Enter a valid amount."),
    currency: z.enum(MVP_CURRENCIES),
    payment_method: z.enum(MANUAL_PAYMENT_METHODS),
    transaction_reference: z.string().trim().max(80).optional().or(z.literal("")),
    notes: z.string().trim().max(400).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (!value.anonymous && !value.member_id) {
      ctx.addIssue({
        code: "custom",
        path: ["member_id"],
        message: "Select a member or mark this as anonymous giving.",
      });
    }
  });

export type GivingCategoryInput = z.infer<typeof givingCategorySchema>;
export type GivingTransactionInput = z.infer<typeof givingTransactionSchema>;
