import { z } from "zod";

export const FAMILY_RELATIONSHIPS = [
  "SPOUSE",
  "PARENT",
  "CHILD",
  "SIBLING",
  "GUARDIAN",
  "DEPENDENT",
  "OTHER",
] as const;

export const familyLinkSchema = z.object({
  member_id: z.string().uuid(),
  related_member_id: z.string().uuid("Select a family member."),
  relationship: z.enum(FAMILY_RELATIONSHIPS),
  notes: z.string().trim().max(240).optional().or(z.literal("")),
});

export type FamilyLinkInput = z.infer<typeof familyLinkSchema>;
