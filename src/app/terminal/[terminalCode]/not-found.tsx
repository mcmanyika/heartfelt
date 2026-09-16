import { TerminalBrand } from "@/components/terminal/terminal-brand";
import { getTenant } from "@/lib/tenant/get-tenant";

export default async function TerminalNotFound() {
  const tenant = await getTenant();
  const name = tenant?.name ?? "This church";
  const example = tenant ? `${tenant.short_code}-HRE-T001` : "GRC-HRE-T001";

  return (
    <div className="terminal-shell" data-theme="night">
      <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
        <TerminalBrand src={tenant?.logo_url} name={name} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-semibold">Terminal not found</h1>
        <p className="kiosk-muted mt-2 max-w-sm text-sm leading-6">
          Check the terminal code with your campus office. Codes look like {example}.
        </p>
      </div>
    </div>
  );
}
