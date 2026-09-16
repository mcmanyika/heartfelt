import { MemberDepartmentsEditor } from "@/components/member/member-departments-editor";
import { ProfileForm } from "@/components/forms/profile-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getMyDepartments, listMyCampusDepartments } from "@/lib/services/department.service";
import { listMyFamily } from "@/lib/services/family.service";
import { getPortalContext } from "@/lib/services/portal.service";
import { familyRelationshipLabel, formatDate, membershipStatusLabel } from "@/lib/utils/format";
import { normalizeGender } from "@/lib/validators/member.schema";

export default async function MemberProfilePage() {
  const { current, member, location } = await getPortalContext();
  const family = member ? await listMyFamily() : { links: [] };
  const departments = member ? await getMyDepartments() : { departments: [] };
  const campusDepartments = member ? await listMyCampusDepartments() : { departments: [] };

  return (
    <>
      <PageHeader
        title="Profile"
        description="Update your personal details and departments. Campus, membership number, and status stay with your campus office."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Account</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-navy">{current.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Membership number</dt>
              <dd className="text-navy">{member?.membership_number || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Membership status</dt>
              <dd className="mt-1">
                {member ? (
                  <StatusBadge
                    status={member.membership_status}
                    label={membershipStatusLabel(member.membership_status)}
                  />
                ) : (
                  <span className="text-gray-600">No membership record is linked to this login yet.</span>
                )}
              </dd>
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
      </div>

      {member ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Departments</h2>
          <p className="mt-2 text-sm text-gray-600">Join or leave ministry teams at your campus.</p>
          <div className="mt-4">
            <MemberDepartmentsEditor
              current={departments.departments}
              available={campusDepartments.departments}
            />
          </div>
        </section>
      ) : null}

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
        <h2 className="mb-3 text-sm font-semibold text-navy">Update profile</h2>
        <ProfileForm
          canEditMembership={Boolean(member)}
          defaultValues={{
            first_name: current.profile.first_name,
            last_name: current.profile.last_name,
            phone: member?.phone ?? current.profile.phone ?? "",
            date_of_birth: member?.date_of_birth ?? "",
            gender: normalizeGender(member?.gender),
            address: member?.address ?? "",
          }}
        />
      </div>
    </>
  );
}
