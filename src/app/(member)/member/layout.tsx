import { MemberShell } from "@/components/member/member-shell";
import { requireRole } from "@/lib/auth/require-role";
import { requireTenant } from "@/lib/tenant/get-tenant";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTenant();
  const current = await requireRole("MEMBER");

  return (
    <MemberShell
      firstName={current.profile.first_name}
      organizationName={current.organizationName}
      organizationLogoUrl={current.organizationLogoUrl}
    >
      {children}
    </MemberShell>
  );
}
