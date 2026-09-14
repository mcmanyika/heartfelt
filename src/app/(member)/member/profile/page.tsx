import { ProfileForm } from "@/components/forms/profile-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { listMyFamily } from "@/lib/services/family.service";
import { getPortalContext } from "@/lib/services/portal.service";
import { familyRelationshipLabel, formatDate, membershipStatusLabel } from "@/lib/utils/format";

export default async function MemberProfilePage() {
  const { current, member, location } = await getPortalContext();
  const family = member ? await listMyFamily() : { links: [] };

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your login details. Membership fields are held by your campus office."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Personal information</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-navy">{current.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone on file</dt>
              <dd className="text-navy">{member?.phone || current.profile.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Date of birth</dt>
              <dd className="text-navy">{formatDate(member?.date_of_birth)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Gender</dt>
              <dd className="text-navy">{member?.gender || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Address</dt>
              <dd className="text-navy">{member?.address || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Church information</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Location</dt>
              <dd className="text-navy">
                {location ? `${location.name} (${location.code})` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">City</dt>
              <dd className="text-navy">
                {location ? `${location.city}, ${location.country}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Date joined</dt>
              <dd className="text-navy">{formatDate(member?.date_joined)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Membership status</h2>
          <div className="mt-4">
            {member ? (
              <StatusBadge
                status={member.membership_status}
                label={membershipStatusLabel(member.membership_status)}
              />
            ) : (
              <p className="text-sm text-gray-600">No membership record is linked to this login yet.</p>
            )}
            {member ? (
              <p className="mt-3 text-sm text-gray-600">{member.membership_number}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Account information</h2>
          <p className="mt-4 text-sm leading-6 text-gray-600">
            You can update the name and phone on your login. Membership number, campus, and
            membership status are managed by church staff.
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-navy">Family</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your campus office manages these connections. Ask them if someone is missing.
        </p>
        <div className="mt-4">
          {family.links.length === 0 ? (
            <EmptyState title="No family connections yet" />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {family.links.map((link) => (
                <li key={link.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-navy">{link.name}</p>
                  <p className="text-xs text-gray-500">
                    {familyRelationshipLabel(link.relationship)} · {link.membership_number} ·{" "}
                    {link.location_name}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-navy">Update login profile</h2>
        <ProfileForm
          defaultValues={{
            first_name: current.profile.first_name,
            last_name: current.profile.last_name,
            phone: current.profile.phone ?? "",
          }}
        />
      </div>
    </>
  );
}
