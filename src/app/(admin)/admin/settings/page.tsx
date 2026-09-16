import { OrganizationForm } from "@/components/forms/organization-form";
import { PageHeader } from "@/components/ui/page-header";
import { getOrganization } from "@/lib/services/organization.service";
import { requestTenantOrigin } from "@/lib/tenant/request-origin";

export default async function AdminSettingsPage() {
  const { organization, error } = await getOrganization();
  const churchUrl = organization ? await requestTenantOrigin(organization.slug) : "";

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
          churchUrl={churchUrl}
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
