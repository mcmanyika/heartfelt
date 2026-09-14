import { z } from "zod";

export const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Enter a first name.").max(80),
  last_name: z.string().trim().min(1, "Enter a last name.").max(80),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;
