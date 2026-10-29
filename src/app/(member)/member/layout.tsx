import { MemberShell } from "@/components/member/member-shell";
import { memberNavItemsForAccess } from "@/lib/auth/member-nav";
import { requireRole } from "@/lib/auth/require-role";
import { canAccessMemberRequisitions } from "@/lib/services/requisition.service";
import { requireTenant } from "@/lib/tenant/get-tenant";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTenant();
  const current = await requireRole("MEMBER");
  const access = await canAccessMemberRequisitions();
  const navItems = memberNavItemsForAccess({
    canAccessRequisitions: access.allowed,
  });

  return (
    <MemberShell
      firstName={current.profile.first_name}
      organizationName={current.organizationName}
      organizationLogoUrl={current.organizationLogoUrl}
      navItems={[...navItems]}
    >
      {children}
    </MemberShell>
  );
}
