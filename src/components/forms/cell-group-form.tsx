"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import {
  createCellGroupAction,
  searchLeadersForCellGroupAction,
  updateCellGroupAction,
} from "@/lib/services/cell-group.actions";
import type { CellGroupMemberOption } from "@/lib/services/cell-group.service";
import { displayMemberName, WEEKDAY_LABELS } from "@/lib/utils/format";
import {
  CELL_GROUP_STATUSES,
  cellGroupSchema,
  type CellGroupInput,
} from "@/lib/validators/cell-group.schema";

type LocationOption = { id: string; name: string; code: string };

type CellGroupFormProps = {
  groupId?: string;
  lockLocation: boolean;
  locations: LocationOption[];
  defaultValues: CellGroupInput;
  initialLeader?: CellGroupMemberOption | null;
};

export function CellGroupForm({
  groupId,
  lockLocation,
  locations,
  defaultValues,
  initialLeader,
}: CellGroupFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<CellGroupMemberOption[]>(initialLeader ? [initialLeader] : []);
  const [isPending, startTransition] = useTransition();
  const [isSearching, startSearch] = useTransition();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CellGroupInput>({
    resolver: zodResolver(cellGroupSchema),
    defaultValues,
  });
  const locationId = watch("location_id");
  const selectedLocation = locations.find((location) => location.id === defaultValues.location_id);

  function searchLeaders() {
    startSearch(async () => {
      const result = await searchLeadersForCellGroupAction(locationId, query);
      setMatches(result.members);
    });
  }

  function onSubmit(values: CellGroupInput) {
    setServerError(null);
    startTransition(async () => {
      const result = groupId
        ? await updateCellGroupAction(groupId, values)
        : await createCellGroupAction(values);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
      noValidate
    >
      {serverError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}

      <FormField
        label="Campus"
        htmlFor="location_id"
        error={errors.location_id?.message}
        hint={lockLocation ? "Derived from your assigned campus." : "Each cell group belongs to one campus."}
      >
        {lockLocation ? (
          <>
            <input type="hidden" {...register("location_id")} />
            <p className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-navy">
              {selectedLocation ? `${selectedLocation.name} (${selectedLocation.code})` : "Assigned location"}
            </p>
          </>
        ) : (
          <select id="location_id" className={fieldClassName} disabled={isPending} {...register("location_id")}>
            <option value="">Select a campus</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.code})
              </option>
            ))}
          </select>
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" htmlFor="name" error={errors.name?.message}>
          <input id="name" className={fieldClassName} disabled={isPending} {...register("name")} />
        </FormField>
        <FormField label="Code" htmlFor="code" error={errors.code?.message} hint="Optional short code.">
          <input id="code" className={fieldClassName} disabled={isPending} {...register("code")} />
        </FormField>
      </div>

      <FormField label="Venue" htmlFor="venue" error={errors.venue?.message}>
        <input id="venue" className={fieldClassName} disabled={isPending} {...register("venue")} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={errors.description?.message}>
        <textarea
          id="description"
          rows={4}
          className={fieldClassName}
          disabled={isPending}
          {...register("description")}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Meeting day" htmlFor="meeting_weekday" error={errors.meeting_weekday?.message}>
          <select
            id="meeting_weekday"
            className={fieldClassName}
            disabled={isPending}
            {...register("meeting_weekday")}
          >
            <option value="">Not set</option>
            {WEEKDAY_LABELS.map((label, index) => (
              <option key={label} value={String(index)}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Meeting time" htmlFor="meeting_time" error={errors.meeting_time?.message}>
          <input
            id="meeting_time"
            type="time"
            className={fieldClassName}
            disabled={isPending}
            {...register("meeting_time")}
          />
        </FormField>
      </div>

      <FormField label="Status" htmlFor="status" error={errors.status?.message}>
        <select id="status" className={fieldClassName} disabled={isPending} {...register("status")}>
          {CELL_GROUP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === "ACTIVE" ? "Active" : "Inactive"}
            </option>
          ))}
        </select>
      </FormField>

      <div className="space-y-3">
        <p className="text-sm font-medium text-navy">Leader</p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or membership number"
            className={fieldClassName}
            aria-label="Search members to lead this group"
          />
          <button
            type="button"
            onClick={searchLeaders}
            disabled={isSearching || !locationId}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy disabled:opacity-70"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
        <FormField label="Group leader" htmlFor="leader_member_id" error={errors.leader_member_id?.message}>
          <select
            id="leader_member_id"
            className={fieldClassName}
            disabled={isPending}
            {...register("leader_member_id")}
          >
            <option value="">No leader assigned</option>
            {matches.map((member) => (
              <option key={member.id} value={member.id}>
                {displayMemberName(member)} · {member.membership_number}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : groupId ? "Save cell group" : "Create cell group"}
      </button>
    </form>
  );
}
