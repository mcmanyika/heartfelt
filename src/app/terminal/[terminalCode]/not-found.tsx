export default function TerminalNotFound() {
  return (
    <div className="terminal-shell" data-theme="night">
      <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
        <p className="kiosk-gold text-sm font-semibold tracking-[0.18em] uppercase">
          Heartfelt International Ministries
        </p>
        <h1 className="mt-4 text-2xl font-semibold">Terminal not found</h1>
        <p className="kiosk-muted mt-2 max-w-sm text-sm leading-6">
          Check the terminal code with your campus office. Codes look like HIM-HRE-T001.
        </p>
      </div>
    </div>
  );
}
