import Link from "next/link";
import { notFound } from "next/navigation";
import { LocationStatusButton } from "@/components/admin/location-status-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getLocation } from "@/lib/services/location.service";

type LocationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LocationDetailPage({ params }: LocationDetailPageProps) {
  const { id } = await params;
  const result = await getLocation(id);

  if (!result.location) {
    notFound();
  }

  const location = result.location;

  return (
    <>
      <PageHeader
        title={location.name}
        description={`${location.city}, ${location.country}`}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/locations/${location.id}/edit`}
              className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
            >
              Edit
            </Link>
            <LocationStatusButton locationId={location.id} status={location.status} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Campus details</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Code</dt>
              <dd className="text-navy">{location.code}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={location.status} />
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Address</dt>
              <dd className="text-navy">{location.address || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-navy">{location.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-navy">{location.email || "—"}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Activity</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Members</dt>
              <dd className="text-2xl font-semibold text-navy">{location.member_count}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Payment terminals</dt>
              <dd className="text-2xl font-semibold text-navy">{location.terminal_count}</dd>
            </div>
          </dl>
          <Link
            href={`/admin/members?location=${location.id}`}
            className="mt-6 inline-block text-sm font-medium text-maroon hover:underline"
          >
            View members
          </Link>
        </section>
      </div>
    </>
  );
}
