import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolvePostLoginPath } from "@/lib/auth/redirect";
import { safeInternalPath } from "@/lib/utils/safe-redirect";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; reason?: string; error?: string }>;
};

function reasonMessage(reason?: string, error?: string) {
  if (reason === "inactive") {
    return "This account is inactive. Contact an administrator.";
  }

  if (error === "auth") {
    return "The sign-in link was invalid or expired. Please sign in again.";
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.next);
  const current = await getCurrentUser();

  if (current && current.profileStatus === "ACTIVE" && current.roleNames.length > 0) {
    redirect(resolvePostLoginPath(current, nextPath));
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <p className="text-sm font-medium tracking-wide text-maroon uppercase">
        Heartfelt International Ministries
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-navy">
        Sign in
      </h1>
      <LoginForm
        nextPath={nextPath}
        initialMessage={reasonMessage(params.reason, params.error)}
      />
      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/" className="font-medium text-maroon hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
