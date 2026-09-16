import Link from "next/link";
import { notFound } from "next/navigation";
import { FamilyConnectForm } from "@/components/admin/family-connect-form";
import { FamilyRemoveButton } from "@/components/admin/family-remove-button";
import { MemberDeactivateButton } from "@/components/admin/member-deactivate-button";
import { MemberTransferDialog } from "@/components/admin/member-transfer-dialog";
import { RegistrationActivateButton } from "@/components/admin/registration-activate-button";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { listMemberFamily } from "@/lib/services/family.service";
import { getMemberCellGroup } from "@/lib/services/cell-group.service";
import { getMemberDepartments } from "@/lib/services/department.service";
import {
  getMember,
  getMemberGiving,
  getMemberUpcomingEvents,
  listTransferDestinations,
} from "@/lib/services/member.service";
import {
  displayMemberName,
  familyRelationshipLabel,
  formatAmount,
  formatDate,
  formatDateTime,
  membershipStatusLabel,
} from "@/lib/utils/format";

type MemberDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { id } = await params;
  const result = await getMember(id);

  if (!result.member) {
    notFound();
  }

  const member = result.member;
  const name = displayMemberName(member);
  const [giving, events, destinations, family, cellGroup, departments] = await Promise.all([
    getMemberGiving(member.id),
    getMemberUpcomingEvents(member),
    listTransferDestinations(member.location_id),
    listMemberFamily(member.id),
    getMemberCellGroup(member.id),
    getMemberDepartments(member.id),
  ]);

  return (
    <>
      <PageHeader
        title={name}
        description={member.membership_number}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/admin/members/${member.id}/edit`}
              className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
            >
              Edit
            </Link>
            <MemberTransferDialog
              memberId={member.id}
              memberName={name}
              destinations={destinations.locations}
            />
            {member.profile_id && member.profile_status === "INACTIVE" ? (
              <RegistrationActivateButton memberId={member.id} memberName={name} />
            ) : null}
            {member.membership_status !== "INACTIVE_MEMBER" ? (
              <MemberDeactivateButton memberId={member.id} memberName={name} />
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Personal information</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-navy">{member.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-navy">{member.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Date of birth</dt>
              <dd className="text-navy">{formatDate(member.date_of_birth)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Gender</dt>
              <dd className="text-navy">{member.gender || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Address</dt>
              <dd className="text-navy">{member.address || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Church information</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Location</dt>
              <dd className="text-navy">
                {member.location_name} ({member.location_code})
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Date joined</dt>
              <dd className="text-navy">{formatDate(member.date_joined)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Cell group</dt>
              <dd className="text-navy">
                {cellGroup.group ? (
                  <Link href={`/admin/cell-groups/${cellGroup.group.id}`} className="hover:underline">
                    {cellGroup.group.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Departments</dt>
              <dd className="text-navy">
                {departments.departments.length === 0 ? (
                  "—"
                ) : (
                  <ul className="space-y-1">
                    {departments.departments.map((department) => (
                      <li key={department.id}>
                        <Link href={`/admin/departments/${department.id}`} className="hover:underline">
                          {department.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Membership status</h2>
          <div className="mt-4">
            <StatusBadge
              status={member.membership_status}
              label={membershipStatusLabel(member.membership_status)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Account information</h2>
          <p className="mt-4 text-sm text-gray-600">
            {member.profile_id && member.profile_status === "INACTIVE"
              ? "This member registered a login. Activate the account before they can sign in."
              : member.profile_id
                ? "This member has a login account. Prefer profile contact details when they differ from the snapshot stored here."
                : "No login account yet. The contact fields on this record will be used until a profile is linked."}
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-navy">Family connections</h2>
        <p className="mt-2 text-sm text-gray-600">
          Link another membership record. Super Admin can connect people across campuses; Location
          Admins stay on their assigned campus.
        </p>
        {"error" in family && family.error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {family.error}
          </p>
        ) : null}
        <div className="mt-4">
          {family.links.length === 0 ? (
            <EmptyState
              title="No family connections yet"
              description="Search for an existing member and choose how they are related."
            />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {family.links.map((link) => (
                <li key={link.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy">
                      <Link href={`/admin/members/${link.related_member_id}`} className="hover:underline">
                        {link.name}
                      </Link>
                    </p>
                    <p className="text-xs text-gray-500">
                      {familyRelationshipLabel(link.relationship)} · {link.membership_number} ·{" "}
                      {link.location_name}
                    </p>
                    {link.notes ? <p className="mt-1 text-xs text-gray-500">{link.notes}</p> : null}
                  </div>
                  <FamilyRemoveButton memberId={member.id} linkId={link.id} relatedName={link.name} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-5 border-t border-border pt-5">
          <FamilyConnectForm memberId={member.id} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-navy">Giving this year</h2>
        {giving.totals.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {giving.totals.map((total) => (
              <p key={total.currency} className="rounded-lg bg-background px-3 py-2 text-sm font-medium text-navy">
                {formatAmount(total.amount, total.currency)}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600">No successful giving recorded this year.</p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-navy">Recent giving</h2>
        <DataTable isEmpty={giving.rows.length === 0} emptyTitle="No giving history">
          <DataTableHead>
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reference</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {giving.rows.map((row) => (
              <tr key={row.id} className="text-navy">
                <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
                <td className="px-4 py-3">{row.category_name}</td>
                <td className="px-4 py-3">{formatAmount(row.amount, row.currency)}</td>
                <td className="px-4 py-3">{row.payment_method.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3">{row.transaction_reference}</td>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-navy">Upcoming events</h2>
        {events.length === 0 ? (
          <EmptyState title="No upcoming events" description="Organization-wide and campus events will appear here." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {events.map((event) => (
              <article key={event.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="font-medium text-navy">{event.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{formatDateTime(event.start_date)}</p>
                <p className="text-sm text-gray-600">{event.venue || "Venue to be confirmed"}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
