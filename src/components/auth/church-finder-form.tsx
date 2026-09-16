"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fieldClassName, FormField } from "@/components/ui/form-field";
import { normalizeRootDomain, supportsTenantSubdomains, tenantPath } from "@/lib/tenant/config";
import { churchSlugSchema, type ChurchSlugInput } from "@/lib/validators/church-signup.schema";

type ChurchFinderFormProps = {
  rootDomain: string;
};

export function ChurchFinderForm({ rootDomain }: ChurchFinderFormProps) {
  const host = normalizeRootDomain(rootDomain) || rootDomain;
  const usesSubdomains = supportsTenantSubdomains(host);
  const example = usesSubdomains ? `heartfelt.${host}` : `${host}${tenantPath("heartfelt")}`;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChurchSlugInput>({
    resolver: zodResolver(churchSlugSchema),
    defaultValues: { slug: "" },
  });

  function onSubmit(values: ChurchSlugInput) {
    if (usesSubdomains) {
      const protocol = window.location.protocol === "http:" ? "http" : "https";
      window.location.assign(`${protocol}://${values.slug}.${host}/login`);
      return;
    }
    window.location.assign(`${tenantPath(values.slug, "/login")}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
      <FormField
        label="Church address"
        htmlFor="slug"
        error={errors.slug?.message}
        hint={`Enter the church address, for example heartfelt for ${example}`}
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
