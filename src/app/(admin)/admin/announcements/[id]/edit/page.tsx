import { notFound, redirect } from "next/navigation";
import { AnnouncementForm } from "@/components/forms/announcement-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { getAnnouncement } from "@/lib/services/announcement.service";
import { canMutateContent, CONTENT_ROLES } from "@/lib/services/event.service";
import { toDateTimeLocalValue } from "@/lib/utils/format";

type EditAnnouncementPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAnnouncementPage({ params }: EditAnnouncementPageProps) {
  const current = await requireRole(CONTENT_ROLES);
  const { id } = await params;
  const result = await getAnnouncement(id);

  if (!result.announcement) {
    notFound();
  }

  const announcement = result.announcement;
  if (!canMutateContent(current, announcement.location_id)) {
    redirect(`/admin/announcements/${announcement.id}`);
  }

  return (
    <>
      <PageHeader
        title={`Edit ${announcement.title}`}
        description="Organization is never taken from the form. Location Admins stay on their campus."
      />
      <AnnouncementForm
        announcementId={announcement.id}
        lockLocation={!current.isSuperAdmin}
        locations={current.accessibleLocations.map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
        }))}
        defaultValues={{
          location_id: announcement.location_id ?? "",
          title: announcement.title,
          message: announcement.message,
          publish_date: toDateTimeLocalValue(announcement.publish_date),
          expiry_date: toDateTimeLocalValue(announcement.expiry_date),
        }}
      />
    </>
  );
}
