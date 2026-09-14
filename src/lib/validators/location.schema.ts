import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().trim().min(2, "Enter the location name.").max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,8}$/, "Use 2-8 letters or numbers."),
  country: z.string().trim().min(2, "Enter the country.").max(80),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || /.+@.+\..+/.test(value), "Enter a valid email."),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type LocationInput = z.infer<typeof locationSchema>;
