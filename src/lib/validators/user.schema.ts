import { z } from "zod";
import { APP_ROLES } from "@/types";

export const userRoleAssignmentSchema = z
  .object({
    role: z.enum(APP_ROLES, { error: "Choose a role." }),
    location_id: z.string().uuid("Choose a campus.").optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.role !== "SUPER_ADMIN" && !value.location_id) {
      ctx.addIssue({
        code: "custom",
        path: ["location_id"],
        message: "Choose a campus for this role.",
      });
    }
  });

export const setUserRolesSchema = z.object({
  user_id: z.string().uuid(),
  assignments: z.array(userRoleAssignmentSchema).min(1, "Assign at least one role."),
});

export type UserRoleAssignmentInput = z.infer<typeof userRoleAssignmentSchema>;
export type SetUserRolesInput = z.infer<typeof setUserRolesSchema>;
