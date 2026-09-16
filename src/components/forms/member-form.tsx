"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import {
  createMemberAction,
  updateMemberAction,
} from "@/lib/services/member.actions";
import { GENDERS, memberSchema, type MemberInput } from "@/lib/validators/member.schema";

type LocationOption = {
  id: string;
  name: string;
  code: string;
};

type MemberFormProps = {
  memberId?: string;
  defaultValues: MemberInput;
  locations: LocationOption[];
  lockLocation: boolean;
};

export function MemberForm({
  memberId,
  defaultValues,
  locations,
  lockLocation,
}: MemberFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberInput>({
    resolver: zodResolver(memberSchema),
    defaultValues,
  });

  function onSubmit(values: MemberInput) {
    setServerError(null);
    startTransition(async () => {
      const result = memberId
        ? await updateMemberAction(memberId, values)
        : await createMemberAction(values);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  const selectedLocation = locations.find((location) => location.id === defaultValues.location_id);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-3xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
      noValidate
    >
      {serverError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="First name" htmlFor="first_name" error={errors.first_name?.message}>
          <input id="first_name" className={fieldClassName} disabled={isPending} {...register("first_name")} />
        </FormField>
        <FormField label="Last name" htmlFor="last_name" error={errors.last_name?.message}>
          <input id="last_name" className={fieldClassName} disabled={isPending} {...register("last_name")} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" className={fieldClassName} disabled={isPending} {...register("email")} />
        </FormField>
        <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <input id="phone" className={fieldClassName} disabled={isPending} {...register("phone")} />
        </FormField>
        <FormField
          label="Location"
          htmlFor="location_id"
          error={errors.location_id?.message}
          hint={lockLocation ? "Derived from your assigned campus." : undefined}
        >
          {lockLocation ? (
            <>
              <input type="hidden" {...register("location_id")} />
              <p className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-navy">
                {selectedLocation
                  ? `${selectedLocation.name} (${selectedLocation.code})`
                  : "Assigned location"}
              </p>
            </>
          ) : (
            <select id="location_id" className={fieldClassName} disabled={isPending} {...register("location_id")}>
              <option value="">Select a location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.code})
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Membership status" htmlFor="membership_status" error={errors.membership_status?.message}>
          <select
            id="membership_status"
            className={fieldClassName}
            disabled={isPending}
            {...register("membership_status")}
          >
            <option value="VISITOR">Visitor</option>
            <option value="NEW_CONVERT">New convert</option>
            <option value="ACTIVE_MEMBER">Active member</option>
            <option value="INACTIVE_MEMBER">Inactive member</option>
            <option value="TRANSFERRED">Transferred</option>
          </select>
        </FormField>
        <FormField label="Date joined" htmlFor="date_joined" error={errors.date_joined?.message}>
          <input
            id="date_joined"
            type="date"
            className={fieldClassName}
            disabled={isPending}
            {...register("date_joined")}
          />
        </FormField>
        <FormField label="Date of birth" htmlFor="date_of_birth" error={errors.date_of_birth?.message}>
          <input
            id="date_of_birth"
            type="date"
            className={fieldClassName}
            disabled={isPending}
            {...register("date_of_birth")}
          />
        </FormField>
        <FormField label="Gender" htmlFor="gender" error={errors.gender?.message}>
          <select id="gender" className={fieldClassName} disabled={isPending} {...register("gender")}>
            <option value="">Select gender</option>
            {GENDERS.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Address" htmlFor="address" error={errors.address?.message}>
        <input id="address" className={fieldClassName} disabled={isPending} {...register("address")} />
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : memberId ? "Save member" : "Create member"}
      </button>
    </form>
  );
}
