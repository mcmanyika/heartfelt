"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import {
  createFamilyLinkAction,
  searchMembersForFamilyAction,
} from "@/lib/services/family.actions";
import type { FamilyMemberOption } from "@/lib/services/family.service";
import { displayMemberName, familyRelationshipLabel } from "@/lib/utils/format";
import {
  FAMILY_RELATIONSHIPS,
  familyLinkSchema,
  type FamilyLinkInput,
} from "@/lib/validators/family.schema";

type FamilyConnectFormProps = {
  memberId: string;
};

export function FamilyConnectForm({ memberId }: FamilyConnectFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<FamilyMemberOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isSearching, startSearch] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FamilyLinkInput>({
    resolver: zodResolver(familyLinkSchema),
    defaultValues: {
      member_id: memberId,
      related_member_id: "",
      relationship: "SPOUSE",
      notes: "",
    },
  });

  function searchMembers() {
    startSearch(async () => {
      const result = await searchMembersForFamilyAction(memberId, query);
      setMatches(result.members);
    });
  }

  function onSubmit(values: FamilyLinkInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await createFamilyLinkAction(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      reset({
        member_id: memberId,
        related_member_id: "",
        relationship: "SPOUSE",
        notes: "",
      });
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

      <input type="hidden" {...register("member_id")} />

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or membership number"
          className={fieldClassName}
          aria-label="Search members to connect"
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

      <FormField label="Family member" htmlFor="related_member_id" error={errors.related_member_id?.message}>
        <select
          id="related_member_id"
          className={fieldClassName}
          disabled={isPending}
          {...register("related_member_id")}
        >
          <option value="">{matches.length ? "Select a member" : "Search first, then select"}</option>
          {matches.map((member) => (
            <option key={member.id} value={member.id}>
              {displayMemberName(member)} · {member.membership_number}
              {member.location_code ? ` · ${member.location_name} (${member.location_code})` : ""}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Relationship" htmlFor="relationship" error={errors.relationship?.message}>
          <select
            id="relationship"
            className={fieldClassName}
            disabled={isPending}
            {...register("relationship")}
          >
            {FAMILY_RELATIONSHIPS.map((value) => (
              <option key={value} value={value}>
                {familyRelationshipLabel(value)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Notes" htmlFor="notes" error={errors.notes?.message}>
          <input id="notes" className={fieldClassName} disabled={isPending} {...register("notes")} />
        </FormField>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Connecting..." : "Connect family member"}
      </button>
    </form>
  );
}
