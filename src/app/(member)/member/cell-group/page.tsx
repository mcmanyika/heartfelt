import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getMyCellGroup } from "@/lib/services/cell-group.service";
import {
  attendanceStatusLabel,
  cellGroupMemberRoleLabel,
  formatCellGroupMeeting,
  formatDate,
} from "@/lib/utils/format";

export default async function MemberCellGroupPage() {
  const { group } = await getMyCellGroup();

  return (
    <>
      <PageHeader
        title="Cell group"
        description="Your home group, meeting time, and recent attendance."
      />

      {!group ? (
        <EmptyState
          title="No cell group assigned"
          description="Ask your campus office to place you in a cell group."
        />
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy">{group.name}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {formatCellGroupMeeting(group.meeting_weekday, group.meeting_time)}
                </p>
              </div>
              <StatusBadge status={group.role} label={cellGroupMemberRoleLabel(group.role)} />
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
                  <li key={row.meeting_date} className="flex items-center justify-between py-3 text-sm">
                    <span className="text-navy">{formatDate(row.meeting_date)}</span>
                    <StatusBadge status={row.status} label={attendanceStatusLabel(row.status)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
