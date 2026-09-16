"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import {
  addDepartmentMemberAction,
  searchMembersForDepartmentAction,
} from "@/lib/services/department.actions";
import type { DepartmentMemberOption } from "@/lib/services/department.service";
import { displayMemberName } from "@/lib/utils/format";
import { departmentMemberSchema, type DepartmentMemberInput } from "@/lib/validators/department.schema";

type DepartmentAddMemberFormProps = {
  departmentId: string;
};

export function DepartmentAddMemberForm({ departmentId }: DepartmentAddMemberFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<DepartmentMemberOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isSearching, startSearch] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentMemberInput>({
    resolver: zodResolver(departmentMemberSchema),
    defaultValues: { department_id: departmentId, member_id: "" },
  });

  function searchMembers() {
    startSearch(async () => {
      const result = await searchMembersForDepartmentAction(departmentId, query);
      setMatches(result.members);
    });
  }

  function onSubmit(values: DepartmentMemberInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await addDepartmentMemberAction(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      reset({ department_id: departmentId, member_id: "" });
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

      <input type="hidden" {...register("department_id")} />

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
        {isPending ? "Adding..." : "Add to department"}
      </button>
    </form>
  );
}
