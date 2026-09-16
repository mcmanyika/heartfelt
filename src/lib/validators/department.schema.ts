import { z } from "zod";

export const DEPARTMENT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const DEPARTMENT_MEMBER_ROLES = ["LEADER", "MEMBER"] as const;

export const departmentSchema = z.object({
  location_id: z.string().uuid("Select a campus."),
  name: z.string().trim().min(2, "Enter a department name.").max(120),
  code: z
    .string()
    .trim()
    .max(16)
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || /^[A-Za-z0-9-]{1,16}$/.test(value), "Use letters, numbers, or hyphens."),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  venue: z.string().trim().max(160).optional().or(z.literal("")),
  leader_member_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(DEPARTMENT_STATUSES),
});

export const departmentMemberSchema = z.object({
  department_id: z.string().uuid(),
  member_id: z.string().uuid("Select a member."),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
export type DepartmentMemberInput = z.infer<typeof departmentMemberSchema>;
export type DepartmentStatusFilter = (typeof DEPARTMENT_STATUSES)[number] | "all";
