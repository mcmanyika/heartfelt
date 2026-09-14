"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import {
  createAnnouncementAction,
  updateAnnouncementAction,
} from "@/lib/services/announcement.actions";
import { announcementSchema, type AnnouncementInput } from "@/lib/validators/announcement.schema";

type LocationOption = { id: string; name: string; code: string };

type AnnouncementFormProps = {
  announcementId?: string;
  lockLocation: boolean;
  locations: LocationOption[];
  defaultValues: AnnouncementInput;
};

export function AnnouncementForm({
  announcementId,
  lockLocation,
  locations,
  defaultValues,
}: AnnouncementFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnnouncementInput>({
    resolver: zodResolver(announcementSchema),
    defaultValues,
  });

  const selectedLocation = locations.find((location) => location.id === defaultValues.location_id);

  function onSubmit(values: AnnouncementInput) {
    setServerError(null);
    startTransition(async () => {
      const result = announcementId
        ? await updateAnnouncementAction(announcementId, values)
        : await createAnnouncementAction(values);
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
      <FormField label="Message" htmlFor="message" error={errors.message?.message}>
        <textarea id="message" rows={6} className={fieldClassName} disabled={isPending} {...register("message")} />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Publish" htmlFor="publish_date" error={errors.publish_date?.message}>
          <input
            id="publish_date"
            type="datetime-local"
            className={fieldClassName}
            disabled={isPending}
            {...register("publish_date")}
          />
        </FormField>
        <FormField
          label="Expires"
          htmlFor="expiry_date"
          hint="Optional. Members stop seeing it after this time."
          error={errors.expiry_date?.message}
        >
          <input
            id="expiry_date"
            type="datetime-local"
            className={fieldClassName}
            disabled={isPending}
            {...register("expiry_date")}
          />
        </FormField>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : announcementId ? "Save announcement" : "Create announcement"}
      </button>
    </form>
  );
}
