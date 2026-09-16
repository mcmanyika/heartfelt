import { OrganizationForm } from "@/components/forms/organization-form";
import { PageHeader } from "@/components/ui/page-header";
import { getOrganization } from "@/lib/services/organization.service";
import { tenantOrigin } from "@/lib/tenant/config";

export default async function AdminSettingsPage() {
  const { organization, error } = await getOrganization();

  return (
    <>
      <PageHeader title="Settings" />

      {error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {organization ? (
        <OrganizationForm
          slug={organization.slug}
          shortCode={organization.short_code}
          churchUrl={tenantOrigin(organization.slug)}
          defaultValues={{
            name: organization.name,
            email: organization.email ?? "",
            phone: organization.phone ?? "",
          }}
        />
      ) : null}
    </>
  );
}
