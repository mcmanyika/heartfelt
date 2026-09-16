"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import { addCellGroupMemberAction } from "@/lib/services/cell-group.actions";
import type { AssignableCellGroupOption } from "@/lib/services/cell-group.service";
import { cellGroupMemberSchema, type CellGroupMemberInput } from "@/lib/validators/cell-group.schema";

type MemberCellGroupFormProps = {
  memberId: string;
  groups: AssignableCellGroupOption[];
  hasCurrentGroup: boolean;
};

export function MemberCellGroupForm({ memberId, groups, hasCurrentGroup }: MemberCellGroupFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CellGroupMemberInput>({
    resolver: zodResolver(cellGroupMemberSchema),
    defaultValues: { cell_group_id: "", member_id: memberId },
  });

  function onSubmit(values: CellGroupMemberInput) {
    setServerError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await addCellGroupMemberAction(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      if (result?.movedFrom) {
        setNotice(`Moved from ${result.movedFrom}.`);
      }
      reset({ cell_group_id: "", member_id: memberId });
    });
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        {hasCurrentGroup
          ? "No other active cell groups on this campus."
          : "No active cell groups on this campus."}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>
      ) : null}

      <input type="hidden" {...register("member_id")} />

      <FormField
        label={hasCurrentGroup ? "Move to another group" : "Cell group"}
        htmlFor="cell_group_id"
        error={errors.cell_group_id?.message}
        hint="A member can belong to one cell group. Choosing another group moves them."
      >
        <select id="cell_group_id" className={fieldClassName} disabled={isPending} {...register("cell_group_id")}>
          <option value="">Select a cell group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
              {group.code ? ` · ${group.code}` : ""}
            </option>
          ))}
        </select>
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : hasCurrentGroup ? "Move to this group" : "Assign cell group"}
      </button>
    </form>
  );
}
