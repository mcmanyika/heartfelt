import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChurchFinderForm } from "@/components/auth/church-finder-form";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolvePostLoginPath } from "@/lib/auth/redirect";
import { PRODUCT_NAME } from "@/lib/tenant/config";
import { getRequestRootDomain } from "@/lib/tenant/request-origin";
import { resolveTenant } from "@/lib/tenant/get-tenant";
import { safeInternalPath } from "@/lib/utils/safe-redirect";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; reason?: string; error?: string }>;
};

function reasonMessage(reason?: string, error?: string) {
  if (reason === "inactive") {
    return "This account is waiting for an administrator to activate it.";
  }

  if (reason === "pending") {
    return "Registration received. A campus administrator will activate your account before you can sign in.";
  }

  if (reason === "church-ready") {
    return "Your church is ready. Sign in with the administrator email you just used.";
  }

  if (reason === "wrong-church") {
    return "This account belongs to a different church.";
  }

  if (error === "auth") {
    return "The sign-in link was invalid or expired. Please sign in again.";
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolution = await resolveTenant();
  if (resolution.kind === "missing") {
    notFound();
  }

  const params = await searchParams;
  const nextPath = safeInternalPath(params.next);
  const current = await getCurrentUser();
  const tenant = resolution.tenant;

  if (
    tenant &&
    current &&
    current.profileStatus === "ACTIVE" &&
    current.roleNames.length > 0 &&
    current.organizationId === tenant.id
  ) {
    redirect(resolvePostLoginPath(current, nextPath));
  }

  if (!tenant) {
    const rootDomain = await getRequestRootDomain();
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium tracking-wide text-maroon uppercase">{PRODUCT_NAME}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-navy">Sign in to your church</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Enter your church address to continue to that congregation’s sign-in page.
        </p>
        <ChurchFinderForm rootDomain={rootDomain} />
        <p className="mt-6 text-center text-sm text-gray-500">
          Starting a new church?{" "}
          <Link href="/start" className="font-medium text-maroon hover:underline">
            Create one
          </Link>
          {" · "}
          <Link href="/" className="font-medium text-maroon hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <p className="text-sm font-medium tracking-wide text-maroon uppercase">{tenant.name}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-navy">Sign in</h1>
      <LoginForm
        nextPath={nextPath}
        initialMessage={reasonMessage(params.reason, params.error)}
      />
      <p className="mt-6 text-center text-sm text-gray-500">
        Need an account?{" "}
        <Link href="/register" className="font-medium text-maroon hover:underline">
          Register
        </Link>
        {" · "}
        <Link href="/" className="font-medium text-maroon hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
