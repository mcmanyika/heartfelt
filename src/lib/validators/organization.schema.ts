import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Enter the organization name.").max(160),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || /.+@.+\..+/.test(value), "Enter a valid email."),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;
