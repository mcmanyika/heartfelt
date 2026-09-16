"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import { createTerminalAction, updateTerminalAction } from "@/lib/services/terminal.actions";
import { TERMINAL_STATUSES, terminalSchema, type TerminalInput } from "@/lib/validators/terminal.schema";
import { terminalStatusLabel } from "@/lib/utils/format";

type LocationOption = { id: string; name: string; code: string };

type TerminalFormProps = {
  terminalId?: string;
  lockLocation: boolean;
  locations: LocationOption[];
  defaultValues: TerminalInput;
};

export function TerminalForm({
  terminalId,
  lockLocation,
  locations,
  defaultValues,
}: TerminalFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TerminalInput>({
    resolver: zodResolver(terminalSchema),
    defaultValues,
  });

  const selectedLocation = locations.find((location) => location.id === defaultValues.location_id);

  function onSubmit(values: TerminalInput) {
    setServerError(null);
    startTransition(async () => {
      const result = terminalId
        ? await updateTerminalAction(terminalId, values)
        : await createTerminalAction(values);
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

      <FormField
        label="Terminal code"
        htmlFor="terminal_code"
        hint="Leave blank to generate CODE-CAMPUS-T000."
        error={errors.terminal_code?.message}
      >
        <input
          id="terminal_code"
          className={fieldClassName}
          disabled={isPending}
          {...register("terminal_code")}
        />
      </FormField>
      <FormField label="Device name" htmlFor="device_name" error={errors.device_name?.message}>
        <input id="device_name" className={fieldClassName} disabled={isPending} {...register("device_name")} />
      </FormField>
      <FormField label="Serial number" htmlFor="serial_number" error={errors.serial_number?.message}>
        <input
          id="serial_number"
          className={fieldClassName}
          disabled={isPending}
          {...register("serial_number")}
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Status" htmlFor="status" error={errors.status?.message}>
          <select id="status" className={fieldClassName} disabled={isPending} {...register("status")}>
            {TERMINAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {terminalStatusLabel(status)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Software version" htmlFor="software_version" error={errors.software_version?.message}>
          <input
            id="software_version"
            className={fieldClassName}
            disabled={isPending}
            {...register("software_version")}
          />
        </FormField>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : terminalId ? "Save terminal" : "Create terminal"}
      </button>
    </form>
  );
}
