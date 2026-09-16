type StatCardProps = {
  label: string;
  value?: React.ReactNode;
  hint?: string;
  loading?: boolean;
};

export function StatCard({ label, value = "—", hint, loading = false }: StatCardProps) {
  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</p>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-gray-200" />
      ) : (
        <div className="mt-3 text-2xl font-semibold tracking-tight text-navy">{value}</div>
      )}
      {hint ? <p className="mt-2 text-xs text-gray-500">{hint}</p> : null}
    </article>
  );
}
