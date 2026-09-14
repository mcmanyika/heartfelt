"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import { updateMyProfileAction } from "@/lib/services/portal.actions";
import { profileSchema, type ProfileInput } from "@/lib/validators/profile.schema";

type ProfileFormProps = {
  defaultValues: ProfileInput;
};

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  function onSubmit(values: ProfileInput) {
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateMyProfileAction(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
      noValidate
    >
      {serverError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Your profile was updated.
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="First name" htmlFor="first_name" error={errors.first_name?.message}>
          <input id="first_name" className={fieldClassName} disabled={isPending} {...register("first_name")} />
        </FormField>
        <FormField label="Last name" htmlFor="last_name" error={errors.last_name?.message}>
          <input id="last_name" className={fieldClassName} disabled={isPending} {...register("last_name")} />
        </FormField>
        <FormField
          label="Phone"
          htmlFor="phone"
          hint="Campus staff still hold your official membership contact details."
          error={errors.phone?.message}
        >
          <input id="phone" className={fieldClassName} disabled={isPending} {...register("phone")} />
        </FormField>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
