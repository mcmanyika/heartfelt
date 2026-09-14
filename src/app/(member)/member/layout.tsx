import { MemberShell } from "@/components/member/member-shell";
import { requireRole } from "@/lib/auth/require-role";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await requireRole("MEMBER");

  return <MemberShell firstName={current.profile.first_name}>{children}</MemberShell>;
}
