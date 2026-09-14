import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import type { AppRole } from "@/types";

type AdminComingSoonProps = {
  title: string;
  description: string;
  allowedRoles: AppRole | readonly AppRole[];
};

export async function AdminComingSoon({
  title,
  description,
  allowedRoles,
}: AdminComingSoonProps) {
  await requireRole(allowedRoles);

  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        title="This section is not ready yet"
        description="The admin workspace is in place. Management tools for this page arrive in a later phase."
      />
    </>
  );
}
