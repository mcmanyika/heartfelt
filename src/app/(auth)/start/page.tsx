import Link from "next/link";
import { redirect } from "next/navigation";
import { ChurchSignupForm } from "@/components/auth/church-signup-form";
import { ReferralCapture } from "@/components/auth/referral-capture";
import { PRODUCT_NAME, isValidTenantSlug } from "@/lib/tenant/config";
import { getRequestRootDomain, requestApexOrigin } from "@/lib/tenant/request-origin";
import { resolveTenant } from "@/lib/tenant/get-tenant";

type StartChurchPageProps = {
  searchParams: Promise<{ ref?: string }>;
};

export default async function StartChurchPage({ searchParams }: StartChurchPageProps) {
  const resolution = await resolveTenant();
  if (resolution.kind === "tenant") {
    redirect("/login");
  }
  if (resolution.kind === "missing") {
    redirect(await requestApexOrigin());
  }

  const params = await searchParams;
  const referralCode =
    params.ref && isValidTenantSlug(params.ref.trim().toLowerCase())
      ? params.ref.trim().toLowerCase()
      : "";
  const rootDomain = await getRequestRootDomain();

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      {referralCode ? <ReferralCapture code={referralCode} /> : null}
      <p className="text-sm font-semibold tracking-tight text-maroon">{PRODUCT_NAME}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-navy">Start your church</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        Create an organization, first campus, and administrator account. Members register later on your church address.
      </p>
      {referralCode ? (
        <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-sm text-navy">
          Referred by <span className="font-semibold">{referralCode}</span>
        </p>
      ) : null}
      <ChurchSignupForm rootDomain={rootDomain} referralCode={referralCode} />
      <p className="mt-6 text-center text-sm text-gray-500">
        Already have a church?{" "}
        <Link href="/login" className="font-medium text-maroon hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
