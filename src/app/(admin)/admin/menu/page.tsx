import { MenuAccessToggles } from "@/components/admin/menu-access-toggles";
import { PageHeader } from "@/components/ui/page-header";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { requireUser } from "@/lib/auth/require-user";
import { listOrgNavAccess } from "@/lib/services/nav-access.service";
import { redirect } from "next/navigation";

export default async function AdminMenuAccessPage() {
  const current = await requireUser();
  if (!isPlatformAdminEmail(current.email)) {
    redirect("/admin/dashboard");
  }

  const data = await listOrgNavAccess();

  return (
    <>
      <PageHeader
        title="Menu access"
        description={`Turn admin menu links on or off for ${current.organizationName}. Dashboard always stays available.`}
      />

      {data.error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {data.error}
        </p>
      ) : null}

      <MenuAccessToggles rows={data.rows} />
    </>
  );
}
