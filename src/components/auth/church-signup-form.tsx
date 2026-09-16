"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fieldClassName, FormField } from "@/components/ui/form-field";
import { createChurchAction } from "@/lib/services/church-signup.actions";
import { getRootDomain } from "@/lib/tenant/config";
import { churchSignupSchema, type ChurchSignupInput } from "@/lib/validators/church-signup.schema";

export function ChurchSignupForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const rootDomain = getRootDomain();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChurchSignupInput>({
    resolver: zodResolver(churchSignupSchema),
    defaultValues: {
      organization_name: "",
      slug: "",
      short_code: "",
      location_name: "",
      location_code: "",
      country: "",
      city: "",
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  const slug = watch("slug");

  function onSubmit(values: ChurchSignupInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await createChurchAction(values);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
      {serverError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}

      <FormField label="Church name" htmlFor="organization_name" error={errors.organization_name?.message}>
        <input id="organization_name" disabled={isPending} className={fieldClassName} {...register("organization_name")} />
      </FormField>

      <FormField
        label="Church address"
        htmlFor="slug"
        error={errors.slug?.message}
        hint={slug ? `${slug}.${rootDomain}` : `Your members will use a subdomain of ${rootDomain}.`}
      >
        <input id="slug" autoCapitalize="none" disabled={isPending} className={fieldClassName} {...register("slug")} />
      </FormField>

      <FormField
        label="Church code"
        htmlFor="short_code"
        error={errors.short_code?.message}
        hint="Used on membership numbers and receipts, for example GRC-HRE-000001."
      >
        <input id="short_code" disabled={isPending} className={fieldClassName} {...register("short_code")} />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="First campus" htmlFor="location_name" error={errors.location_name?.message}>
          <input id="location_name" disabled={isPending} className={fieldClassName} {...register("location_name")} />
        </FormField>
        <FormField label="Campus code" htmlFor="location_code" error={errors.location_code?.message}>
          <input id="location_code" disabled={isPending} className={fieldClassName} {...register("location_code")} />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="City" htmlFor="city" error={errors.city?.message}>
          <input id="city" disabled={isPending} className={fieldClassName} {...register("city")} />
        </FormField>
        <FormField label="Country" htmlFor="country" error={errors.country?.message}>
          <input id="country" disabled={isPending} className={fieldClassName} {...register("country")} />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Your first name" htmlFor="first_name" error={errors.first_name?.message}>
          <input id="first_name" autoComplete="given-name" disabled={isPending} className={fieldClassName} {...register("first_name")} />
        </FormField>
        <FormField label="Your last name" htmlFor="last_name" error={errors.last_name?.message}>
          <input id="last_name" autoComplete="family-name" disabled={isPending} className={fieldClassName} {...register("last_name")} />
        </FormField>
      </div>

      <FormField label="Admin email" htmlFor="email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" disabled={isPending} className={fieldClassName} {...register("email")} />
      </FormField>

      <FormField label="Password" htmlFor="password" error={errors.password?.message}>
        <input id="password" type="password" autoComplete="new-password" disabled={isPending} className={fieldClassName} {...register("password")} />
      </FormField>

      <FormField label="Confirm password" htmlFor="confirm_password" error={errors.confirm_password?.message}>
        <input
          id="confirm_password"
          type="password"
          autoComplete="new-password"
          disabled={isPending}
          className={fieldClassName}
          {...register("confirm_password")}
        />
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#761834] disabled:opacity-70"
      >
        {isPending ? "Creating church..." : "Create church"}
      </button>
    </form>
  );
}
