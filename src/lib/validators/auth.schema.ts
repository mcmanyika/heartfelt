import { z } from "zod";
import { normalizePhoneToE164 } from "@/lib/utils/phone";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const phoneField = z
  .string()
  .trim()
  .min(1, "Enter your mobile number.")
  .max(40, "Enter a shorter mobile number.")
  .refine((value) => Boolean(normalizePhoneToE164(value)), {
    message: "Enter a valid mobile number with country code (e.g. +263771234567).",
  });

export const mobileLoginRequestSchema = z.object({
  phone: phoneField,
});

export const mobileLoginVerifySchema = z.object({
  phone: phoneField,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your SMS."),
});

export const signupSchema = z
  .object({
    first_name: z.string().trim().min(1, "Enter a first name.").max(80),
    last_name: z.string().trim().min(1, "Enter a last name.").max(80),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    location_id: z.string().uuid("Select your campus."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(8, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type MobileLoginRequestInput = z.infer<typeof mobileLoginRequestSchema>;
export type MobileLoginVerifyInput = z.infer<typeof mobileLoginVerifySchema>;
export type SignupInput = z.infer<typeof signupSchema>;
