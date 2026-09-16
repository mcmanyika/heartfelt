import { z } from "zod";
import { GENDERS, optionalDate } from "@/lib/validators/member.schema";

export const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Enter a first name.").max(80),
  last_name: z.string().trim().min(1, "Enter a last name.").max(80),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  date_of_birth: optionalDate,
  gender: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || GENDERS.includes(value as (typeof GENDERS)[number]), "Select Female or Male."),
  address: z.string().trim().max(240).optional().or(z.literal("")),
});

export const myDepartmentSchema = z.object({
  department_id: z.string().uuid("Select a department."),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type MyDepartmentInput = z.infer<typeof myDepartmentSchema>;
