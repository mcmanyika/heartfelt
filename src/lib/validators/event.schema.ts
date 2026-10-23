import { z } from "zod";
import { STRIPE_GIVING_CURRENCIES } from "@/lib/validators/member-giving.schema";

export const EVENT_WHEN_FILTERS = ["upcoming", "past", "all"] as const;
export const EVENT_REGISTRATION_STATUSES = ["REGISTERED", "ATTENDED", "CANCELLED"] as const;
export const EVENT_ATTENDANCE_MODES = ["LIVE", "ONLINE", "HYBRID"] as const;
export const EVENT_TICKET_CURRENCIES = STRIPE_GIVING_CURRENCIES;

export const eventSchema = z
  .object({
    location_id: z.string().uuid().optional().or(z.literal("")),
    title: z.string().trim().min(2, "Enter an event title.").max(160),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    attendance_mode: z.enum(EVENT_ATTENDANCE_MODES),
    venue: z.string().trim().max(160).optional().or(z.literal("")),
    online_url: z.string().trim().max(500).optional().or(z.literal("")),
    start_date: z.string().trim().min(1, "Enter a start date."),
    end_date: z.string().trim().optional().or(z.literal("")),
    registration_required: z.boolean(),
    is_paid: z.boolean(),
    price: z.string().trim().optional().or(z.literal("")),
    currency: z.enum(EVENT_TICKET_CURRENCIES).optional().or(z.literal("")),
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

    if (value.attendance_mode === "LIVE" && value.online_url) {
      ctx.addIssue({
        code: "custom",
        path: ["online_url"],
        message: "Online link is only for online or hybrid events.",
      });
    }

    if (
      (value.attendance_mode === "ONLINE" || value.attendance_mode === "HYBRID") &&
      value.online_url &&
      !/^https?:\/\/.+/i.test(value.online_url)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["online_url"],
        message: "Enter a valid http(s) link.",
      });
    }

    if (value.is_paid) {
      if (!value.registration_required) {
        ctx.addIssue({
          code: "custom",
          path: ["registration_required"],
          message: "Paid events must allow member registration.",
        });
      }
      if (!value.currency) {
        ctx.addIssue({ code: "custom", path: ["currency"], message: "Select a currency." });
      }
      if (!value.price || !/^\d+(\.\d{1,2})?$/.test(value.price) || Number(value.price) <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["price"],
          message: "Enter a ticket price greater than 0.",
        });
      } else {
        const minimum = value.currency === "ZAR" ? 5 : 0.5;
        if (Number(value.price) < minimum) {
          ctx.addIssue({
            code: "custom",
            path: ["price"],
            message: `Enter at least ${minimum.toFixed(2)} ${value.currency || "USD"}.`,
          });
        }
      }
    }
  });

export type EventInput = z.infer<typeof eventSchema>;
export type EventWhenFilter = (typeof EVENT_WHEN_FILTERS)[number];
export type EventAttendanceMode = (typeof EVENT_ATTENDANCE_MODES)[number];
