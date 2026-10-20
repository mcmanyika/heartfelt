import { z } from "zod";
import { STRIPE_GIVING_CURRENCIES } from "@/lib/validators/member-giving.schema";

export const PAYMENT_BUTTON_AMOUNT_MODES = ["FIXED", "OPEN"] as const;

const amountString = z
  .string()
  .trim()
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0, "Enter a valid amount.");

export const paymentButtonSchema = z
  .object({
    location_id: z.string().uuid("Select a location.").optional().or(z.literal("")),
    giving_category_id: z.string().uuid("Select a giving category."),
    name: z.string().trim().min(2, "Enter a name.").max(80),
    button_label: z.string().trim().min(1, "Enter a button label.").max(40),
    amount_mode: z.enum(PAYMENT_BUTTON_AMOUNT_MODES),
    amount: z.string().trim().optional().or(z.literal("")),
    currency: z.enum(STRIPE_GIVING_CURRENCIES),
    active: z.boolean(),
    success_message: z.string().trim().max(240).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.amount_mode === "FIXED") {
      if (!value.amount || !/^\d+(\.\d{1,2})?$/.test(value.amount) || Number(value.amount) <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Enter a fixed amount.",
        });
        return;
      }
      const minimum = value.currency === "ZAR" ? 5 : 0.5;
      if (Number(value.amount) < minimum) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: `Enter at least ${minimum.toFixed(2)} ${value.currency}.`,
        });
      }
    }
  });

export const embedGivingCheckoutSchema = z
  .object({
    token: z.string().trim().min(16).max(64),
    amount: amountString.optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.amount) {
      const amount = Number(value.amount);
      if (!(amount > 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Enter a valid amount.",
        });
      }
    }
  });

export type PaymentButtonInput = z.infer<typeof paymentButtonSchema>;
export type EmbedGivingCheckoutInput = z.infer<typeof embedGivingCheckoutSchema>;
