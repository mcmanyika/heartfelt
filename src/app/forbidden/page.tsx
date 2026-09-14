import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium tracking-wide text-maroon uppercase">
          Access denied
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-navy">
          You do not have access
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          This account is signed in but does not have permission to view that
          page. Contact your church administrator if you believe this is a
          mistake.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
