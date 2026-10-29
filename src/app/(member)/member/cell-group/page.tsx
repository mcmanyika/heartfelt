import { CellGroupJoinRequests } from "@/components/member/cell-group-join-requests";
import { MemberCellGroupEditor } from "@/components/member/member-cell-group-editor";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getMyCellGroup,
  listLedCellGroupJoinRequests,
  listMyCampusCellGroups,
} from "@/lib/services/cell-group.service";
import {
  attendanceStatusLabel,
  cellGroupMemberRoleLabel,
  cellGroupMembershipStatusLabel,
  formatCellGroupMeeting,
  formatDate,
} from "@/lib/utils/format";

export default async function MemberCellGroupPage() {
  const [{ group }, campus, led] = await Promise.all([
    getMyCellGroup(),
    listMyCampusCellGroups(),
    listLedCellGroupJoinRequests(),
  ]);

  return (
    <>
      <PageHeader title="Cell group" />

      {led.requests.length > 0 ? (
        <div className="mb-6">
          <CellGroupJoinRequests requests={led.requests} />
        </div>
      ) : null}

      <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <MemberCellGroupEditor current={group} available={campus.groups} />
      </section>

      {group && group.status === "ACTIVE" ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy">{group.name}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {formatCellGroupMeeting(group.meeting_weekday, group.meeting_time)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  status={group.status}
                  label={cellGroupMembershipStatusLabel(group.status)}
                />
                <StatusBadge status={group.role} label={cellGroupMemberRoleLabel(group.role)} />
              </div>
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Leader</dt>
                <dd className="text-navy">{group.leader_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Venue</dt>
                <dd className="text-navy">{group.venue || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-navy">Recent attendance</h2>
            {group.attendance.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">No meetings recorded yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {group.attendance.map((row) => (
                  <li
                    key={row.meeting_date}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <span className="text-navy">{formatDate(row.meeting_date)}</span>
                    <StatusBadge status={row.status} label={attendanceStatusLabel(row.status)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
