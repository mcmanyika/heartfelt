"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fieldClassName, FormField } from "@/components/ui/form-field";
import { churchSlugSchema, type ChurchSlugInput } from "@/lib/validators/church-signup.schema";

type ChurchFinderFormProps = {
  rootDomain: string;
};

export function ChurchFinderForm({ rootDomain }: ChurchFinderFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChurchSlugInput>({
    resolver: zodResolver(churchSlugSchema),
    defaultValues: { slug: "" },
  });

  function onSubmit(values: ChurchSlugInput) {
    const protocol = window.location.protocol === "http:" ? "http" : "https";
    window.location.assign(`${protocol}://${values.slug}.${rootDomain}/login`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
      <FormField
        label="Church address"
        htmlFor="slug"
        error={errors.slug?.message}
        hint={`Enter the subdomain, for example heartfelt for heartfelt.${rootDomain}`}
      >
        <input id="slug" autoCapitalize="none" className={fieldClassName} {...register("slug")} />
      </FormField>

      <button
        type="submit"
        className="w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#761834]"
      >
        Continue to sign in
      </button>
    </form>
  );
}
