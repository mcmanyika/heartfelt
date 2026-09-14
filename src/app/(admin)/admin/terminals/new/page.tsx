import { TerminalForm } from "@/components/forms/terminal-form";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import { TERMINAL_MUTATE_ROLES } from "@/lib/services/terminal.service";
import { TERMINAL_SOFTWARE_VERSION } from "@/lib/validators/terminal.schema";

export default async function NewTerminalPage() {
  const current = await requireRole(TERMINAL_MUTATE_ROLES);
  const selection = await getAdminLocationSelection(current);
  const locationId = current.isSuperAdmin
    ? (selection.locationId ?? "")
    : (current.staffLocationIds[0] ?? current.primaryLocationId ?? "");

  return (
    <>
      <PageHeader
        title="Add terminal"
        description="Organization and location are taken from your session. A code is generated if you leave it blank."
      />
      <TerminalForm
        lockLocation={!current.isSuperAdmin}
        locations={current.accessibleLocations.map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
        }))}
        defaultValues={{
          location_id: locationId,
          terminal_code: "",
          device_name: "",
          serial_number: "",
          status: "OFFLINE",
          software_version: TERMINAL_SOFTWARE_VERSION,
        }}
      />
    </>
  );
}
