export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-sm text-gray-600 shadow-sm">
      {label}
    </div>
  );
}
