import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getHomePath } from "@/lib/auth/permissions";
import { PRODUCT_NAME } from "@/lib/tenant/config";
import { resolveTenant } from "@/lib/tenant/get-tenant";

export default async function HomePage() {
  const resolution = await resolveTenant();
  if (resolution.kind === "missing") {
    notFound();
  }

  const current = await getCurrentUser();
  const tenant = resolution.tenant;
  const signedIn =
    current && current.profileStatus === "ACTIVE" && current.roleNames.length > 0;
  const continueHref = signedIn ? getHomePath(current) : "/login";

  if (tenant) {
    return (
      <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <p className="text-sm font-medium tracking-wide text-maroon uppercase">{tenant.name}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
            Welcome
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Sign in to manage this church, or register as a member. A campus administrator activates new accounts before they can sign in.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={continueHref}
              className="inline-flex items-center justify-center rounded-lg bg-maroon px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#761834]"
            >
              {signedIn ? "Continue" : "Sign in"}
            </Link>
            {!signedIn ? (
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-navy"
              >
                Register
              </Link>
            ) : (
              <p className="self-center text-sm text-gray-600">
                Signed in as {current.profile.first_name}
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-sm font-medium tracking-wide text-maroon uppercase">{PRODUCT_NAME}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
          Church management for every campus
        </h1>
        <p className="mt-4 text-base leading-7 text-gray-600">
          Each church gets its own address, members, giving, and administrators. Sign in at your church, or start a new one.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-maroon px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#761834]"
          >
            Sign in to your church
          </Link>
          <Link
            href="/start"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-navy"
          >
            Start your church
          </Link>
        </div>
      </div>
    </main>
  );
}
