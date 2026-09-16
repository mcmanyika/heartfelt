"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import {
  addCellGroupMemberAction,
  searchMembersForCellGroupAction,
} from "@/lib/services/cell-group.actions";
import type { CellGroupMemberOption } from "@/lib/services/cell-group.service";
import { displayMemberName } from "@/lib/utils/format";
import { cellGroupMemberSchema, type CellGroupMemberInput } from "@/lib/validators/cell-group.schema";

type CellGroupAddMemberFormProps = {
  groupId: string;
};

export function CellGroupAddMemberForm({ groupId }: CellGroupAddMemberFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<CellGroupMemberOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isSearching, startSearch] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CellGroupMemberInput>({
    resolver: zodResolver(cellGroupMemberSchema),
    defaultValues: { cell_group_id: groupId, member_id: "" },
  });

  function searchMembers() {
    startSearch(async () => {
      const result = await searchMembersForCellGroupAction(groupId, query);
      setMatches(result.members);
    });
  }

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
      reset({ cell_group_id: groupId, member_id: "" });
      setMatches([]);
      setQuery("");
    });
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

      <input type="hidden" {...register("cell_group_id")} />

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or membership number"
          className={fieldClassName}
          aria-label="Search members to add"
        />
        <button
          type="button"
          onClick={searchMembers}
          disabled={isSearching}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy disabled:opacity-70"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      <FormField label="Member" htmlFor="member_id" error={errors.member_id?.message}>
        <select id="member_id" className={fieldClassName} disabled={isPending} {...register("member_id")}>
          <option value="">{matches.length ? "Select a member" : "Search first, then select"}</option>
          {matches.map((member) => (
            <option key={member.id} value={member.id}>
              {displayMemberName(member)} · {member.membership_number}
            </option>
          ))}
        </select>
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Adding..." : "Add to group"}
      </button>
    </form>
  );
}
