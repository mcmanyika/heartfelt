import { notFound } from "next/navigation";
import { TerminalKiosk } from "@/components/terminal/terminal-kiosk";
import { getPublicTerminal } from "@/lib/services/terminal.service";
import { requireTenant } from "@/lib/tenant/get-tenant";

type TerminalPageProps = {
  params: Promise<{ terminalCode: string }>;
};

export default async function TerminalPage({ params }: TerminalPageProps) {
  await requireTenant();
  const { terminalCode } = await params;
  const { terminal } = await getPublicTerminal(decodeURIComponent(terminalCode));

  if (!terminal) {
    notFound();
  }

  return <TerminalKiosk terminal={terminal} />;
}
