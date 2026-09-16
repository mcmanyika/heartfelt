"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import { updateOrganizationAction } from "@/lib/services/organization.actions";
import {
  organizationSchema,
  type OrganizationInput,
} from "@/lib/validators/organization.schema";

type OrganizationFormProps = {
  slug: string;
  shortCode: string;
  churchUrl: string;
  defaultValues: OrganizationInput;
};

export function OrganizationForm({ slug, shortCode, churchUrl, defaultValues }: OrganizationFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema),
    defaultValues,
  });

  function onSubmit(values: OrganizationInput) {
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateOrganizationAction(values);
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
      className="max-w-xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
      noValidate
    >
      {serverError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Organization details saved.
        </p>
      ) : null}

      <FormField label="Name" htmlFor="name" error={errors.name?.message}>
        <input id="name" className={fieldClassName} disabled={isPending} {...register("name")} />
      </FormField>
      <FormField
        label="Church address"
        htmlFor="slug"
        hint={`Members sign in at ${churchUrl}. This cannot be changed here.`}
      >
        <input id="slug" className={fieldClassName} value={slug} disabled readOnly />
      </FormField>
      <FormField
        label="Church code"
        htmlFor="short_code"
        hint="Used on membership numbers and receipts. This cannot be changed after create."
      >
        <input id="short_code" className={fieldClassName} value={shortCode} disabled readOnly />
      </FormField>
      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          className={fieldClassName}
          disabled={isPending}
          {...register("email")}
        />
      </FormField>
      <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
        <input id="phone" className={fieldClassName} disabled={isPending} {...register("phone")} />
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : "Save organization"}
      </button>
    </form>
  );
}
