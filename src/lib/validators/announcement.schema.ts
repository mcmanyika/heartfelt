import { z } from "zod";

export const ANNOUNCEMENT_STATUS_FILTERS = ["current", "scheduled", "expired", "all"] as const;

export const announcementSchema = z
  .object({
    location_id: z.string().uuid().optional().or(z.literal("")),
    title: z.string().trim().min(2, "Enter an announcement title.").max(160),
    message: z.string().trim().min(2, "Enter the announcement message.").max(4000),
    publish_date: z.string().trim().min(1, "Enter a publish date."),
    expiry_date: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const publish = new Date(value.publish_date);
    if (Number.isNaN(publish.getTime())) {
      ctx.addIssue({ code: "custom", path: ["publish_date"], message: "Enter a valid publish date." });
      return;
    }

    if (value.expiry_date) {
      const expiry = new Date(value.expiry_date);
      if (Number.isNaN(expiry.getTime()) || expiry < publish) {
        ctx.addIssue({
          code: "custom",
          path: ["expiry_date"],
          message: "Expiry must be on or after the publish date.",
        });
      }
    }
  });

export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type AnnouncementStatusFilter = (typeof ANNOUNCEMENT_STATUS_FILTERS)[number];
