import { z } from "zod";

export const MEMBERSHIP_STATUSES = [
  "VISITOR",
  "NEW_CONVERT",
  "ACTIVE_MEMBER",
  "INACTIVE_MEMBER",
  "TRANSFERRED",
] as const;

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date.");

export const memberSchema = z.object({
  first_name: z.string().trim().min(1, "Enter a first name.").max(80),
  last_name: z.string().trim().min(1, "Enter a last name.").max(80),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || /.+@.+\..+/.test(value), "Enter a valid email."),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  location_id: z.string().uuid("Select a location.").optional().or(z.literal("")),
  membership_status: z.enum(MEMBERSHIP_STATUSES),
  date_joined: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date joined."),
  date_of_birth: optionalDate,
  gender: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
});

export const memberTransferSchema = z.object({
  member_id: z.string().uuid(),
  to_location_id: z.string().uuid("Select a destination location."),
});

export type MemberInput = z.infer<typeof memberSchema>;
export type MemberTransferInput = z.infer<typeof memberTransferSchema>;
