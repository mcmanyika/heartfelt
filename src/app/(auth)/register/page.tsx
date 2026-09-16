import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolvePostLoginPath } from "@/lib/auth/redirect";
import { listPublicCampuses } from "@/lib/services/registration.service";
import { requireTenant } from "@/lib/tenant/get-tenant";

export default async function RegisterPage() {
  const tenant = await requireTenant();
  const current = await getCurrentUser();
  if (
    current &&
    current.profileStatus === "ACTIVE" &&
    current.roleNames.length > 0 &&
    current.organizationId === tenant.id
  ) {
    redirect(resolvePostLoginPath(current));
  }

  const { campuses } = await listPublicCampuses();

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <p className="text-sm font-medium tracking-wide text-maroon uppercase">{tenant.name}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-navy">Create an account</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        Register as a member. A campus administrator will activate your login before you can sign in.
      </p>
      <RegisterForm campuses={campuses} />
      <p className="mt-6 text-center text-sm text-gray-500">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-maroon hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
