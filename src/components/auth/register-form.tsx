"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fieldClassName, FormField } from "@/components/ui/form-field";
import { registerMemberAction } from "@/lib/services/registration.actions";
import type { PublicCampus } from "@/lib/services/registration.service";
import { signupSchema, type SignupInput } from "@/lib/validators/auth.schema";

type RegisterFormProps = {
  campuses: PublicCampus[];
};

export function RegisterForm({ campuses }: RegisterFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      location_id: campuses[0]?.id ?? "",
      password: "",
      confirm_password: "",
    },
  });

  function onSubmit(values: SignupInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await registerMemberAction(values);
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

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="First name" htmlFor="first_name" error={errors.first_name?.message}>
          <input
            id="first_name"
            autoComplete="given-name"
            disabled={isPending}
            className={fieldClassName}
            {...register("first_name")}
          />
        </FormField>
        <FormField label="Last name" htmlFor="last_name" error={errors.last_name?.message}>
          <input
            id="last_name"
            autoComplete="family-name"
            disabled={isPending}
            className={fieldClassName}
            {...register("last_name")}
          />
        </FormField>
      </div>

      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          disabled={isPending}
          className={fieldClassName}
          {...register("email")}
        />
      </FormField>

      <FormField label="Phone" htmlFor="phone" error={errors.phone?.message} hint="Optional">
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          disabled={isPending}
          className={fieldClassName}
          {...register("phone")}
        />
      </FormField>

      <FormField label="Campus" htmlFor="location_id" error={errors.location_id?.message}>
        <select id="location_id" disabled={isPending || campuses.length === 0} className={fieldClassName} {...register("location_id")}>
          {campuses.length === 0 ? <option value="">No campuses available</option> : null}
          {campuses.map((campus) => (
            <option key={campus.id} value={campus.id}>
              {campus.name} ({campus.code})
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Password" htmlFor="password" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          disabled={isPending}
          className={fieldClassName}
          {...register("password")}
        />
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
        disabled={isPending || campuses.length === 0}
        className="w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#761834] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Submitting..." : "Create account"}
      </button>
    </form>
  );
}
