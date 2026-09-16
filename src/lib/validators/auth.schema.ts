import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
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
export type SignupInput = z.infer<typeof signupSchema>;
