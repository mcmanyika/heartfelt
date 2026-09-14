import { notFound } from "next/navigation";
import { TerminalKiosk } from "@/components/terminal/terminal-kiosk";
import { getPublicTerminal } from "@/lib/services/terminal.service";

type TerminalPageProps = {
  params: Promise<{ terminalCode: string }>;
};

export default async function TerminalPage({ params }: TerminalPageProps) {
  const { terminalCode } = await params;
  const { terminal } = await getPublicTerminal(decodeURIComponent(terminalCode));

  if (!terminal) {
    notFound();
  }

  return <TerminalKiosk terminal={terminal} />;
}
