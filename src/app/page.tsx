import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getHomePath } from "@/lib/auth/permissions";

export default async function HomePage() {
  const current = await getCurrentUser();
  const href =
    current && current.profileStatus === "ACTIVE" && current.roleNames.length > 0
      ? getHomePath(current)
      : "/login";

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <p className="text-sm font-medium tracking-wide text-maroon uppercase">
          Heartfelt International Ministries
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
          Church management platform
        </h1>
        <p className="mt-4 text-base leading-7 text-gray-600">
          Sign in with your assigned role. Access is enforced in the database
          and again on the server. The interface only hides what you should not
          see.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={href}
            className="inline-flex items-center justify-center rounded-lg bg-maroon px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#761834]"
          >
            {current ? "Continue" : "Sign in"}
          </Link>
          {current ? (
            <p className="self-center text-sm text-gray-600">
              Signed in as {current.profile.first_name}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
