"use client";

import { useState, useTransition } from "react";
import { fieldClassName } from "@/components/ui/form-field";
import { recordCellGroupAttendanceAction } from "@/lib/services/cell-group.actions";
import type { CellGroupAttendanceMark } from "@/lib/services/cell-group.service";
import { attendanceStatusLabel } from "@/lib/utils/format";
import { CELL_GROUP_ATTENDANCE_STATUSES } from "@/lib/validators/cell-group.schema";
import type { CellGroupAttendanceStatus } from "@/types";

type CellGroupAttendanceFormProps = {
  groupId: string;
  meetingDate: string;
  notes: string;
  marks: CellGroupAttendanceMark[];
};

export function CellGroupAttendanceForm({
  groupId,
  meetingDate,
  notes: initialNotes,
  marks,
}: CellGroupAttendanceFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [date, setDate] = useState(meetingDate);
  const [notes, setNotes] = useState(initialNotes);
  const [statuses, setStatuses] = useState<Record<string, CellGroupAttendanceStatus>>(() =>
    Object.fromEntries(marks.map((mark) => [mark.member_id, mark.status])),
  );
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    startTransition(async () => {
      const result = await recordCellGroupAttendanceAction({
        cell_group_id: groupId,
        meeting_date: date,
        notes,
        attendance: marks.map((mark) => ({
          member_id: mark.member_id,
          status: statuses[mark.member_id] ?? "PRESENT",
        })),
      });
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  if (marks.length === 0) {
    return <p className="text-sm text-gray-600">Add members before recording attendance.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {serverError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-navy">
          Meeting date
          <input
            type="date"
            name="meeting_date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={`${fieldClassName} mt-1.5`}
            required
          />
        </label>
        <label className="text-sm font-medium text-navy">
          Notes
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={`${fieldClassName} mt-1.5`}
            maxLength={2000}
          />
        </label>
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {marks.map((mark) => (
          <li key={mark.member_id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-navy">{mark.member_name}</p>
              <p className="text-xs text-gray-500">{mark.membership_number}</p>
            </div>
            <fieldset className="flex flex-wrap gap-3">
              <legend className="sr-only">Attendance for {mark.member_name}</legend>
              {CELL_GROUP_ATTENDANCE_STATUSES.map((status) => (
                <label key={status} className="flex items-center gap-1.5 text-sm text-navy">
                  <input
                    type="radio"
                    name={`attendance-${mark.member_id}`}
                    checked={(statuses[mark.member_id] ?? "PRESENT") === status}
                    onChange={() => setStatuses((current) => ({ ...current, [mark.member_id]: status }))}
                  />
                  {attendanceStatusLabel(status)}
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ul>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : "Save attendance"}
      </button>
    </form>
  );
}
