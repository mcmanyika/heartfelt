import Link from "next/link";
import { redirect } from "next/navigation";
import { ChurchSignupForm } from "@/components/auth/church-signup-form";
import { PRODUCT_NAME, apexOrigin } from "@/lib/tenant/config";
import { resolveTenant } from "@/lib/tenant/get-tenant";

export default async function StartChurchPage() {
  const resolution = await resolveTenant();
  if (resolution.kind === "tenant") {
    redirect("/login");
  }
  if (resolution.kind === "missing") {
    redirect(apexOrigin());
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <p className="text-sm font-medium tracking-wide text-maroon uppercase">{PRODUCT_NAME}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-navy">Start your church</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        Create an organization, first campus, and administrator account. Members register later on your church address.
      </p>
      <ChurchSignupForm />
      <p className="mt-6 text-center text-sm text-gray-500">
        Already have a church?{" "}
        <Link href="/login" className="font-medium text-maroon hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
