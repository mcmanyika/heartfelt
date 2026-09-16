import { z } from "zod";

export const CELL_GROUP_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const CELL_GROUP_MEMBER_ROLES = ["LEADER", "MEMBER"] as const;
export const CELL_GROUP_ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "EXCUSED"] as const;
export const CELL_GROUP_WEEKDAYS = ["0", "1", "2", "3", "4", "5", "6"] as const;

export const cellGroupSchema = z.object({
  location_id: z.string().uuid("Select a campus."),
  name: z.string().trim().min(2, "Enter a group name.").max(120),
  code: z
    .string()
    .trim()
    .max(16)
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || /^[A-Za-z0-9-]{1,16}$/.test(value), "Use letters, numbers, or hyphens."),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  venue: z.string().trim().max(160).optional().or(z.literal("")),
  meeting_weekday: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || CELL_GROUP_WEEKDAYS.includes(value as (typeof CELL_GROUP_WEEKDAYS)[number]), "Select a meeting day."),
  meeting_time: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || /^\d{2}:\d{2}(:\d{2})?$/.test(value), "Enter a valid time."),
  leader_member_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(CELL_GROUP_STATUSES),
});

export const cellGroupMemberSchema = z.object({
  cell_group_id: z.string().uuid(),
  member_id: z.string().uuid("Select a member."),
});

export const cellGroupAttendanceSchema = z.object({
  cell_group_id: z.string().uuid(),
  meeting_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a meeting date."),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  attendance: z
    .array(
      z.object({
        member_id: z.string().uuid(),
        status: z.enum(CELL_GROUP_ATTENDANCE_STATUSES),
      }),
    )
    .min(1, "Mark attendance for at least one member."),
});

export type CellGroupInput = z.infer<typeof cellGroupSchema>;
export type CellGroupMemberInput = z.infer<typeof cellGroupMemberSchema>;
export type CellGroupAttendanceInput = z.infer<typeof cellGroupAttendanceSchema>;
export type CellGroupStatusFilter = (typeof CELL_GROUP_STATUSES)[number] | "all";
