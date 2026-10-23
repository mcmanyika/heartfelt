import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type StatCardProps = {
  label: string;
  value?: React.ReactNode;
  hint?: string;
  loading?: boolean;
  href?: string;
};

export function StatCard({ label, value = "—", hint, loading = false, href }: StatCardProps) {
  const className = cn(
    "flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-5",
    href && "transition-colors hover:border-navy/25 hover:bg-background/60",
  );

  const body = (
    <>
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</p>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-gray-200" />
      ) : (
        <div className="mt-3 min-w-0 flex-1 text-2xl font-semibold tracking-tight text-navy">{value}</div>
      )}
      {hint ? <p className="mt-3 text-xs text-gray-500">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={`View ${label}`}>
        {body}
      </Link>
    );
  }

  return <article className={className}>{body}</article>;
}
