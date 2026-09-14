"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import {
  createGivingCategoryAction,
  updateGivingCategoryAction,
} from "@/lib/services/giving.actions";
import { givingCategorySchema, type GivingCategoryInput } from "@/lib/validators/giving.schema";

type GivingCategoryFormProps = {
  categoryId?: string;
  defaultValues: GivingCategoryInput;
};

export function GivingCategoryForm({ categoryId, defaultValues }: GivingCategoryFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GivingCategoryInput>({
    resolver: zodResolver(givingCategorySchema),
    defaultValues,
  });

  function onSubmit(values: GivingCategoryInput) {
    setServerError(null);
    startTransition(async () => {
      const result = categoryId
        ? await updateGivingCategoryAction(categoryId, values)
        : await createGivingCategoryAction(values);
      if (result?.error) {
        setServerError(result.error);
      }
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

      <FormField label="Name" htmlFor="name" error={errors.name?.message}>
        <input id="name" className={fieldClassName} disabled={isPending} {...register("name")} />
      </FormField>
      <FormField label="Description" htmlFor="description" error={errors.description?.message}>
        <input id="description" className={fieldClassName} disabled={isPending} {...register("description")} />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-navy">
        <input type="checkbox" disabled={isPending} {...register("active")} />
        Active
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : categoryId ? "Save category" : "Create category"}
      </button>
    </form>
  );
}
