"use client";

import { useRef, useState, useTransition } from "react";
import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { ChurchLogo } from "@/components/ui/church-logo";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import {
  removeOrganizationLogoAction,
  uploadOrganizationLogoAction,
} from "@/lib/services/organization.actions";

type OrganizationLogoFormProps = {
  organizationName: string;
  logoSrc: string | null;
};

export function OrganizationLogoForm({ organizationName, logoSrc }: OrganizationLogoFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await uploadOrganizationLogoAction(formData);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      setSaved(true);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
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
          Church logo saved.
        </p>
      ) : null}

      <div>
        <h2 className="text-sm font-semibold text-navy">Church logo</h2>
        <p className="mt-1 text-sm text-gray-600">
          Shown on sign-in and in the admin menu. PNG, JPG, WEBP, or SVG up to 5 MB.
        </p>
      </div>

      <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4">
        {logoSrc ? (
          <ChurchLogo
            src={logoSrc}
            name={organizationName}
            imageClassName="max-h-20 max-w-[220px]"
          />
        ) : (
          <p className="text-sm text-gray-500">No logo uploaded yet.</p>
        )}
      </div>

      <FormField label="Logo file" htmlFor="logo">
        <input
          id="logo"
          name="logo"
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          disabled={isPending}
          className={fieldClassName}
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isPending ? "Uploading..." : "Upload logo"}
        </button>
        {logoSrc ? (
          <DeleteRecordButton
            title="Remove this logo"
            message="The current church logo will be removed from sign-in and the admin menu."
            confirmLabel="Remove"
            triggerLabel="Remove logo"
            onConfirm={() => removeOrganizationLogoAction()}
          />
        ) : null}
      </div>
    </form>
  );
}
