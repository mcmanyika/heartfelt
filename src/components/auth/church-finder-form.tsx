"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fieldClassName, FormField } from "@/components/ui/form-field";
import { getRootDomain, originProtocol } from "@/lib/tenant/config";
import { churchSlugSchema, type ChurchSlugInput } from "@/lib/validators/church-signup.schema";

export function ChurchFinderForm() {
  const rootDomain = getRootDomain();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChurchSlugInput>({
    resolver: zodResolver(churchSlugSchema),
    defaultValues: { slug: "" },
  });

  function onSubmit(values: ChurchSlugInput) {
    window.location.assign(`${originProtocol()}://${values.slug}.${rootDomain}/login`);
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
