import { OrganizationForm } from "@/components/forms/organization-form";
import { PageHeader } from "@/components/ui/page-header";
import { getOrganization } from "@/lib/services/organization.service";

export default async function AdminSettingsPage() {
  const { organization, error } = await getOrganization();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Organization contact details and the security posture this MVP enforces."
      />

      {error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {organization ? (
        <OrganizationForm
          slug={organization.slug}
          defaultValues={{
            name: organization.name,
            email: organization.email ?? "",
            phone: organization.phone ?? "",
          }}
        />
      ) : null}

      <section className="mt-8 max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-navy">Security posture</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-600">
          <li>Row Level Security is enabled and forced on application tables.</li>
          <li>Server helpers resolve organization and location from the signed-in session, never from the browser.</li>
          <li>The service-role key stays on the server for kiosk inserts and privileged Auth lookups.</li>
          <li>Audit logs are append-only. Super Admin can read them; application roles cannot update or delete them.</li>
          <li>Location Admin and Finance stay on their assigned campus. Super Admin can compare locations on reports.</li>
          <li>Users cannot change their own account status. Only a Super Admin can suspend or reactivate someone else.</li>
        </ul>
      </section>
    </>
  );
}
