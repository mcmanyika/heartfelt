import { notFound } from "next/navigation";
import { TerminalForm } from "@/components/forms/terminal-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { getTerminal, TERMINAL_MUTATE_ROLES } from "@/lib/services/terminal.service";

type EditTerminalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTerminalPage({ params }: EditTerminalPageProps) {
  const current = await requireRole(TERMINAL_MUTATE_ROLES);
  const { id } = await params;
  const result = await getTerminal(id);

  if (!result.terminal) {
    notFound();
  }

  const terminal = result.terminal;

  return (
    <>
      <PageHeader
        title={`Edit ${terminal.device_name}`}
        description="Assignment stays on a campus you can access. The organization is never taken from the form."
      />
      <TerminalForm
        terminalId={terminal.id}
        lockLocation={!current.isSuperAdmin}
        locations={current.accessibleLocations.map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
        }))}
        defaultValues={{
          location_id: terminal.location_id,
          terminal_code: terminal.terminal_code,
          device_name: terminal.device_name,
          serial_number: terminal.serial_number ?? "",
          status: terminal.status,
          software_version: terminal.software_version ?? "",
        }}
      />
    </>
  );
}
