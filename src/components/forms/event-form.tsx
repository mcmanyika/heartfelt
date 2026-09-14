"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import { createEventAction, updateEventAction } from "@/lib/services/event.actions";
import { eventSchema, type EventInput } from "@/lib/validators/event.schema";

type LocationOption = { id: string; name: string; code: string };

type EventFormProps = {
  eventId?: string;
  lockLocation: boolean;
  locations: LocationOption[];
  defaultValues: EventInput;
};

export function EventForm({ eventId, lockLocation, locations, defaultValues }: EventFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues,
  });

  const selectedLocation = locations.find((location) => location.id === defaultValues.location_id);

  function onSubmit(values: EventInput) {
    setServerError(null);
    startTransition(async () => {
      const result = eventId ? await updateEventAction(eventId, values) : await createEventAction(values);
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
        label="Location"
        htmlFor="location_id"
        error={errors.location_id?.message}
        hint={
          lockLocation
            ? "Derived from your assigned campus."
            : "Leave as all locations to publish organization-wide."
        }
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
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.code})
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField label="Title" htmlFor="title" error={errors.title?.message}>
        <input id="title" className={fieldClassName} disabled={isPending} {...register("title")} />
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
      <FormField label="Venue" htmlFor="venue" error={errors.venue?.message}>
        <input id="venue" className={fieldClassName} disabled={isPending} {...register("venue")} />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Starts" htmlFor="start_date" error={errors.start_date?.message}>
          <input
            id="start_date"
            type="datetime-local"
            className={fieldClassName}
            disabled={isPending}
            {...register("start_date")}
          />
        </FormField>
        <FormField label="Ends" htmlFor="end_date" hint="Optional." error={errors.end_date?.message}>
          <input
            id="end_date"
            type="datetime-local"
            className={fieldClassName}
            disabled={isPending}
            {...register("end_date")}
          />
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm text-navy">
        <input type="checkbox" disabled={isPending} {...register("registration_required")} />
        Members can register
      </label>

      <FormField
        label="Capacity"
        htmlFor="capacity"
        hint="Optional. Leave blank for unlimited seats when registration is on."
        error={errors.capacity?.message}
      >
        <input
          id="capacity"
          inputMode="numeric"
          className={fieldClassName}
          disabled={isPending}
          {...register("capacity")}
        />
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : eventId ? "Save event" : "Create event"}
      </button>
    </form>
  );
}
