import Link from "next/link";
import { notFound } from "next/navigation";
import { CellGroupAddMemberForm } from "@/components/admin/cell-group-add-member-form";
import { CellGroupAttendanceForm } from "@/components/admin/cell-group-attendance-form";
import { CellGroupDeleteButton } from "@/components/admin/cell-group-delete-button";
import { CellGroupRemoveMemberButton } from "@/components/admin/cell-group-remove-member-button";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/require-role";
import {
  canMutateCellGroup,
  CELL_GROUP_ROLES,
  getCellGroup,
  getCellGroupAttendance,
  listCellGroupMeetings,
  listCellGroupMembers,
} from "@/lib/services/cell-group.service";
import { cellGroupMemberRoleLabel, formatCellGroupMeeting, formatDate } from "@/lib/utils/format";

type CellGroupDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function CellGroupDetailPage({ params, searchParams }: CellGroupDetailPageProps) {
  const current = await requireRole(CELL_GROUP_ROLES);
  const { id } = await params;
  const query = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const meetingDate = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? (query.date as string) : today;
  const [{ group }, roster, meetings, attendance] = await Promise.all([
    getCellGroup(id),
    listCellGroupMembers(id),
    listCellGroupMeetings(id),
    getCellGroupAttendance(id, meetingDate),
  ]);

  if (!group) {
    notFound();
  }

  const canMutate = canMutateCellGroup(current, group.location_id);

  return (
    <>
      <PageHeader
        title={group.name}
        description={`${group.location_name} (${group.location_code})${group.code ? ` · ${group.code}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {canMutate ? (
              <>
                <Link
                  href={`/admin/cell-groups/${group.id}/edit`}
                  className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
                >
                  Edit
                </Link>
                <CellGroupDeleteButton groupId={group.id} />
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Details</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={group.status} label={group.status === "ACTIVE" ? "Active" : "Inactive"} />
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Leader</dt>
              <dd className="text-navy">{group.leader_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Venue</dt>
              <dd className="text-navy">{group.venue || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Meets</dt>
              <dd className="text-navy">{formatCellGroupMeeting(group.meeting_weekday, group.meeting_time)}</dd>
            </div>
            {group.description ? (
              <div>
                <dt className="text-gray-500">Description</dt>
                <dd className="text-navy whitespace-pre-wrap">{group.description}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-navy">Add member</h2>
          <p className="mt-2 text-sm text-gray-600">
            A member can only be in one cell group. Adding them here moves them from any previous group.
          </p>
          {canMutate ? (
            <div className="mt-4">
              <CellGroupAddMemberForm groupId={group.id} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600">You can view this roster but not change it.</p>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-navy">Roster</h2>
        {roster.error ? (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {roster.error}
          </p>
        ) : null}
        <DataTable isEmpty={roster.rows.length === 0} emptyTitle="No members in this group yet">
          <DataTableHead>
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              {canMutate ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </DataTableHead>
          <DataTableBody>
            {roster.rows.map((row) => (
              <tr key={row.id} className="text-navy">
                <td className="px-4 py-3">
                  <Link href={`/admin/members/${row.member_id}`} className="font-medium hover:underline">
                    {row.member_name}
                  </Link>
                  <p className="text-xs text-gray-500">{row.membership_number}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.role} label={cellGroupMemberRoleLabel(row.role)} />
                </td>
                <td className="px-4 py-3">{formatDate(row.joined_at)}</td>
                {canMutate ? (
                  <td className="px-4 py-3">
                    <CellGroupRemoveMemberButton
                      groupId={group.id}
                      membershipId={row.id}
                      memberName={row.member_name}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-navy">Record attendance</h2>
        <p className="mt-2 text-sm text-gray-600">Saving the same date again updates that meeting.</p>
        {attendance.error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {attendance.error}
          </p>
        ) : canMutate ? (
          <div className="mt-4">
            <CellGroupAttendanceForm
              key={meetingDate}
              groupId={group.id}
              meetingDate={meetingDate}
              notes={attendance.notes}
              marks={attendance.marks}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600">You can view meeting history but not record attendance.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-navy">Meeting history</h2>
        {meetings.rows.length === 0 ? (
          <EmptyState title="No meetings recorded" description="Save attendance to start the history for this group." />
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Present</th>
                <th className="px-4 py-3">Absent</th>
                <th className="px-4 py-3">Excused</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {meetings.rows.map((meeting) => (
                <tr key={meeting.id} className="text-navy">
                  <td className="px-4 py-3">{formatDate(meeting.meeting_date)}</td>
                  <td className="px-4 py-3">{meeting.present}</td>
                  <td className="px-4 py-3">{meeting.absent}</td>
                  <td className="px-4 py-3">{meeting.excused}</td>
                  <td className="px-4 py-3">{meeting.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/cell-groups/${group.id}?date=${meeting.meeting_date}`}
                      className="text-sm font-medium text-maroon hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </section>
    </>
  );
}
