import Link from "next/link";
import { notFound } from "next/navigation";
import { AnnouncementDeleteButton } from "@/components/admin/announcement-delete-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/require-role";
import { getAnnouncement } from "@/lib/services/announcement.service";
import { canMutateContent, CONTENT_ROLES } from "@/lib/services/event.service";
import { announcementStatusLabel, announcementVisibility, formatDateTime } from "@/lib/utils/format";

type AnnouncementDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnnouncementDetailPage({ params }: AnnouncementDetailPageProps) {
  const current = await requireRole(CONTENT_ROLES);
  const { id } = await params;
  const { announcement } = await getAnnouncement(id);

  if (!announcement) {
    notFound();
  }

  const canMutate = canMutateContent(current, announcement.location_id);
  const visibility = announcementVisibility(announcement.publish_date, announcement.expiry_date);

  return (
    <>
      <PageHeader
        title={announcement.title}
        description={
          announcement.location_name
            ? `${announcement.location_name} (${announcement.location_code})`
            : "All locations"
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {canMutate ? (
              <>
                <Link
                  href={`/admin/announcements/${announcement.id}/edit`}
                  className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
                >
                  Edit
                </Link>
                <AnnouncementDeleteButton announcementId={announcement.id} />
              </>
            ) : null}
          </div>
        }
      />

      <section className="max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={visibility} label={announcementStatusLabel(visibility)} />
          <p className="text-sm text-gray-500">Published {formatDateTime(announcement.publish_date)}</p>
          {announcement.expiry_date ? (
            <p className="text-sm text-gray-500">Expires {formatDateTime(announcement.expiry_date)}</p>
          ) : null}
        </div>
        <p className="mt-5 text-sm leading-7 whitespace-pre-wrap text-navy">{announcement.message}</p>
      </section>
    </>
  );
}
