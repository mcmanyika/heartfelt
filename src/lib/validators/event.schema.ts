import { z } from "zod";

export const EVENT_WHEN_FILTERS = ["upcoming", "past", "all"] as const;
export const EVENT_REGISTRATION_STATUSES = ["REGISTERED", "ATTENDED", "CANCELLED"] as const;

export const eventSchema = z
  .object({
    location_id: z.string().uuid().optional().or(z.literal("")),
    title: z.string().trim().min(2, "Enter an event title.").max(160),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    venue: z.string().trim().max(160).optional().or(z.literal("")),
    start_date: z.string().trim().min(1, "Enter a start date."),
    end_date: z.string().trim().optional().or(z.literal("")),
    registration_required: z.boolean(),
    capacity: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((value) => !value || (/^\d+$/.test(value) && Number(value) > 0), "Enter a whole number greater than 0."),
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.start_date);
    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({ code: "custom", path: ["start_date"], message: "Enter a valid start date." });
      return;
    }

    if (value.end_date) {
      const end = new Date(value.end_date);
      if (Number.isNaN(end.getTime()) || end < start) {
        ctx.addIssue({
          code: "custom",
          path: ["end_date"],
          message: "End must be on or after the start.",
        });
      }
    }
  });

export type EventInput = z.infer<typeof eventSchema>;
export type EventWhenFilter = (typeof EVENT_WHEN_FILTERS)[number];
