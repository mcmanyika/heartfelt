"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/lib/services/announcement.service";

function revalidateAnnouncementPaths(announcementId?: string) {
  revalidatePath("/admin/announcements");
  revalidatePath("/admin/dashboard");
  revalidatePath("/member/announcements");
  revalidatePath("/member/dashboard");
  if (announcementId) {
    revalidatePath(`/admin/announcements/${announcementId}`);
  }
}

export async function createAnnouncementAction(input: unknown) {
  const result = await createAnnouncement(input);
  if (result.error || !result.id) {
    return { error: result.error ?? "Unable to create the announcement." };
  }

  revalidateAnnouncementPaths(result.id);
  redirect(`/admin/announcements/${result.id}`);
}

export async function updateAnnouncementAction(announcementId: string, input: unknown) {
  const result = await updateAnnouncement(announcementId, input);
  if (result.error) {
    return { error: result.error };
  }

  revalidateAnnouncementPaths(announcementId);
  redirect(`/admin/announcements/${announcementId}`);
}

export async function deleteAnnouncementAction(announcementId: string) {
  const result = await deleteAnnouncement(announcementId);
  if (result.error) {
    return { error: result.error };
  }

  revalidateAnnouncementPaths();
  redirect("/admin/announcements");
}
