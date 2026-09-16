import { z } from "zod";
import { isValidShortCode, isValidTenantSlug } from "@/lib/tenant/config";

export const churchSignupSchema = z
  .object({
    organization_name: z.string().trim().min(2, "Enter the church name.").max(160),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "Choose a church address.")
      .max(48)
      .refine(isValidTenantSlug, "Use lowercase letters, numbers, and hyphens. This address is reserved or invalid."),
    short_code: z
      .string()
      .trim()
      .toUpperCase()
      .refine(isValidShortCode, "Use 2-8 letters or numbers."),
    location_name: z.string().trim().min(2, "Enter the first campus name.").max(120),
    location_code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{2,8}$/, "Use 2-8 letters or numbers."),
    country: z.string().trim().min(2, "Enter the country.").max(80),
    city: z.string().trim().min(2, "Enter the city.").max(80),
    first_name: z.string().trim().min(1, "Enter a first name.").max(80),
    last_name: z.string().trim().min(1, "Enter a last name.").max(80),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(8, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

export type ChurchSignupInput = z.infer<typeof churchSignupSchema>;

export const churchSlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Enter your church address.")
    .refine(isValidTenantSlug, "Enter a valid church address."),
});

export type ChurchSlugInput = z.infer<typeof churchSlugSchema>;
