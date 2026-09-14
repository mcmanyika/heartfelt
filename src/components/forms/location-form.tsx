"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import {
  createLocationAction,
  updateLocationAction,
} from "@/lib/services/location.actions";
import { locationSchema, type LocationInput } from "@/lib/validators/location.schema";

type LocationFormProps = {
  locationId?: string;
  defaultValues: LocationInput;
};

export function LocationForm({ locationId, defaultValues }: LocationFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues,
  });

  function onSubmit(values: LocationInput) {
    setServerError(null);
    startTransition(async () => {
      const result = locationId
        ? await updateLocationAction(locationId, values)
        : await createLocationAction(values);
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

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Location name" htmlFor="name" error={errors.name?.message}>
          <input id="name" className={fieldClassName} disabled={isPending} {...register("name")} />
        </FormField>
        <FormField
          label="Code"
          htmlFor="code"
          hint="Unique campus code, such as HRE."
          error={errors.code?.message}
        >
          <input id="code" className={fieldClassName} disabled={isPending} {...register("code")} />
        </FormField>
        <FormField label="City" htmlFor="city" error={errors.city?.message}>
          <input id="city" className={fieldClassName} disabled={isPending} {...register("city")} />
        </FormField>
        <FormField label="Country" htmlFor="country" error={errors.country?.message}>
          <input id="country" className={fieldClassName} disabled={isPending} {...register("country")} />
        </FormField>
        <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <input id="phone" className={fieldClassName} disabled={isPending} {...register("phone")} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" className={fieldClassName} disabled={isPending} {...register("email")} />
        </FormField>
      </div>

      <FormField label="Address" htmlFor="address" error={errors.address?.message}>
        <input id="address" className={fieldClassName} disabled={isPending} {...register("address")} />
      </FormField>

      <FormField label="Status" htmlFor="status" error={errors.status?.message}>
        <select id="status" className={fieldClassName} disabled={isPending} {...register("status")}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : locationId ? "Save location" : "Create location"}
      </button>
    </form>
  );
}
