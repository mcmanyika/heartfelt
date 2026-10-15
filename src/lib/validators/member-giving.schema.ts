import { z } from "zod";

export const STRIPE_GIVING_CURRENCIES = ["USD", "ZAR"] as const;

export const memberGivingCheckoutSchema = z
  .object({
    giving_category_id: z.string().uuid("Select a giving category."),
    amount: z
      .string()
      .trim()
      .refine((value) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0, "Enter a valid amount."),
    currency: z.enum(STRIPE_GIVING_CURRENCIES),
  })
  .superRefine((value, ctx) => {
    const amount = Number(value.amount);
    const minimum = value.currency === "ZAR" ? 5 : 0.5;
    if (amount < minimum) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: `Enter at least ${minimum.toFixed(2)} ${value.currency}.`,
      });
    }
  });

export type MemberGivingCheckoutInput = z.infer<typeof memberGivingCheckoutSchema>;
