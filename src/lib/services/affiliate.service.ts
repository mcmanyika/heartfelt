import "server-only";

import { cookies } from "next/headers";
import {
  AFFILIATE_COMMISSION_RATE_BPS,
  AFFILIATE_REFERRAL_COOKIE,
  AFFILIATE_REFERRAL_COOKIE_MAX_AGE,
  affiliateCommissionCents,
} from "@/lib/affiliate/constants";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { apexOrigin, isValidTenantSlug, tenantOrigin } from "@/lib/tenant/config";
import { logServerError } from "@/lib/utils/log-server-error";

export type AffiliateCommissionStatus = "PENDING" | "APPROVED" | "PAID" | "VOID";

export type AffiliateCommissionRow = {
  id: string;
  referredOrganizationId: string;
  referredOrganizationName: string;
  packagePaymentId: string;
  setupCents: number;
  commissionCents: number;
  currency: string;
  status: AffiliateCommissionStatus;
  createdAt: string;
  paidAt: string | null;
};

export type AffiliateReferralRow = {
  referredOrganizationId: string;
  referredOrganizationName: string;
  referralCode: string;
  createdAt: string;
};

function normalizeReferralCode(value: string | null | undefined) {
  const code = value?.trim().toLowerCase() ?? "";
  return code && isValidTenantSlug(code) ? code : null;
}

export async function captureReferralCode(rawCode: string | null | undefined) {
  const code = normalizeReferralCode(rawCode);
  if (!code) {
    return { error: "That referral code is not valid." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("id, slug")
    .or(`slug.eq.${code},short_code.eq.${code.toUpperCase()}`)
    .maybeSingle();

  if (error) {
    logServerError("affiliate.capture.lookup", error);
    return { error: "Unable to check that referral code." };
  }
  if (!data) {
    return { error: "No church matches that referral code." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AFFILIATE_REFERRAL_COOKIE, String((data as { slug: string }).slug), {
    path: "/",
    sameSite: "lax",
    maxAge: AFFILIATE_REFERRAL_COOKIE_MAX_AGE,
  });

  return { ok: true as const, code: String((data as { slug: string }).slug) };
}

export async function readReferralCodeFromCookie() {
  const cookieStore = await cookies();
  return normalizeReferralCode(cookieStore.get(AFFILIATE_REFERRAL_COOKIE)?.value);
}

export async function clearReferralCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AFFILIATE_REFERRAL_COOKIE);
}

export async function resolveReferrerOrganizationId(rawCode: string | null | undefined) {
  const code = normalizeReferralCode(rawCode) ?? (await readReferralCodeFromCookie());
  if (!code) {
    return { referrerOrganizationId: null as string | null, referralCode: null as string | null };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("id, slug")
    .or(`slug.eq.${code},short_code.eq.${code.toUpperCase()}`)
    .maybeSingle();

  if (error) {
    logServerError("affiliate.resolve", error);
    return { referrerOrganizationId: null, referralCode: null, error: "Unable to resolve that referral." };
  }
  if (!data) {
    return { referrerOrganizationId: null, referralCode: null };
  }

  return {
    referrerOrganizationId: String((data as { id: string }).id),
    referralCode: String((data as { slug: string }).slug),
  };
}

export async function recordOrganizationReferral(input: {
  referredOrganizationId: string;
  referralCode?: string | null;
}) {
  const resolved = await resolveReferrerOrganizationId(input.referralCode);
  if (resolved.error) {
    return { error: resolved.error };
  }
  if (!resolved.referrerOrganizationId || !resolved.referralCode) {
    return { ok: true as const, recorded: false as const };
  }
  if (resolved.referrerOrganizationId === input.referredOrganizationId) {
    return { ok: true as const, recorded: false as const };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("organization_referrals").insert({
    referred_organization_id: input.referredOrganizationId,
    referrer_organization_id: resolved.referrerOrganizationId,
    referral_code: resolved.referralCode,
  } as never);

  if (error) {
    if (error.code === "23505") {
      return { ok: true as const, recorded: false as const };
    }
    logServerError("affiliate.recordReferral", error);
    return { error: "Unable to save the referral attribution." };
  }

  await clearReferralCookie();
  return {
    ok: true as const,
    recorded: true as const,
    referrerOrganizationId: resolved.referrerOrganizationId,
  };
}

export async function createAffiliateCommissionForPayment(input: {
  packagePaymentId: string;
  referredOrganizationId: string;
  setupCents: number;
  currency: string;
}) {
  if (input.setupCents <= 0) {
    return;
  }

  const admin = createAdminClient();
  const { data: referral, error: referralError } = await admin
    .from("organization_referrals")
    .select("referrer_organization_id")
    .eq("referred_organization_id", input.referredOrganizationId)
    .maybeSingle();

  if (referralError) {
    logServerError("affiliate.commission.referral", referralError);
    return;
  }
  if (!referral) {
    return;
  }

  const referrerOrganizationId = String(
    (referral as { referrer_organization_id: string }).referrer_organization_id,
  );
  const commissionCents = affiliateCommissionCents(input.setupCents);

  const { error } = await admin.from("affiliate_commissions").insert({
    referrer_organization_id: referrerOrganizationId,
    referred_organization_id: input.referredOrganizationId,
    package_payment_id: input.packagePaymentId,
    setup_cents: input.setupCents,
    rate_bps: AFFILIATE_COMMISSION_RATE_BPS,
    commission_cents: commissionCents,
    currency: input.currency || "usd",
    status: "PENDING",
  } as never);

  if (error) {
    if (error.code === "23505") {
      return;
    }
    logServerError("affiliate.commission.insert", error);
  }
}

export async function voidAffiliateCommissionForPayment(packagePaymentId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("affiliate_commissions")
    .update({
      status: "VOID",
      voided_at: new Date().toISOString(),
    } as never)
    .eq("package_payment_id", packagePaymentId)
    .neq("status", "VOID");

  if (error) {
    logServerError("affiliate.commission.void", error);
  }
}

export async function getAffiliateDashboard() {
  const current = await requireRole("SUPER_ADMIN");
  const supabase = await createClient();
  const organizationId = current.organizationId;

  const [orgResult, referralsResult, commissionsResult] = await Promise.all([
    supabase.from("organizations").select("slug, short_code, name").eq("id", organizationId).maybeSingle(),
    supabase
      .from("organization_referrals")
      .select("referred_organization_id, referral_code, created_at")
      .eq("referrer_organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("affiliate_commissions")
      .select(
        "id, referred_organization_id, package_payment_id, setup_cents, commission_cents, currency, status, created_at, paid_at",
      )
      .eq("referrer_organization_id", organizationId)
      .order("created_at", { ascending: false }),
  ]);

  if (orgResult.error) {
    logServerError("affiliate.dashboard.org", orgResult.error);
  }
  if (referralsResult.error) {
    logServerError("affiliate.dashboard.referrals", referralsResult.error);
  }
  if (commissionsResult.error) {
    logServerError("affiliate.dashboard.commissions", commissionsResult.error);
  }

  const org = orgResult.data as { slug: string; short_code: string; name: string } | null;
  const referralCode = org?.slug ?? "";
  const shareUrl = referralCode ? `${apexOrigin()}/start?ref=${encodeURIComponent(referralCode)}` : "";
  const churchOrigin = referralCode ? tenantOrigin(referralCode) : "";

  const referralRows = (referralsResult.data ?? []) as Array<Record<string, unknown>>;
  const commissionRows = (commissionsResult.data ?? []) as Array<Record<string, unknown>>;
  const referredIds = [
    ...new Set([
      ...referralRows.map((row) => String(row.referred_organization_id)),
      ...commissionRows.map((row) => String(row.referred_organization_id)),
    ]),
  ];

  const nameById = new Map<string, string>();
  if (referredIds.length > 0) {
    const { data: referredOrgs, error: referredError } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", referredIds);
    if (referredError) {
      logServerError("affiliate.dashboard.referredNames", referredError);
    } else {
      for (const row of (referredOrgs ?? []) as Array<{ id: string; name: string }>) {
        nameById.set(row.id, row.name);
      }
    }
  }

  const referrals: AffiliateReferralRow[] = referralRows.map((row) => {
    const id = String(row.referred_organization_id);
    return {
      referredOrganizationId: id,
      referredOrganizationName: nameById.get(id) ?? "Church",
      referralCode: String(row.referral_code),
      createdAt: String(row.created_at),
    };
  });

  const commissions: AffiliateCommissionRow[] = commissionRows.map((row) => {
    const id = String(row.referred_organization_id);
    return {
      id: String(row.id),
      referredOrganizationId: id,
      referredOrganizationName: nameById.get(id) ?? "Church",
      packagePaymentId: String(row.package_payment_id),
      setupCents: Number(row.setup_cents),
      commissionCents: Number(row.commission_cents),
      currency: String(row.currency),
      status: row.status as AffiliateCommissionStatus,
      createdAt: String(row.created_at),
      paidAt: row.paid_at ? String(row.paid_at) : null,
    };
  });

  const pendingCents = commissions
    .filter((row) => row.status === "PENDING" || row.status === "APPROVED")
    .reduce((sum, row) => sum + row.commissionCents, 0);
  const paidCents = commissions
    .filter((row) => row.status === "PAID")
    .reduce((sum, row) => sum + row.commissionCents, 0);

  return {
    referralCode,
    shareUrl,
    churchOrigin,
    organizationName: org?.name ?? current.organizationName,
    referrals,
    commissions,
    pendingCents,
    paidCents,
    ratePercent: AFFILIATE_COMMISSION_RATE_BPS / 100,
    error:
      referralsResult.error || commissionsResult.error
        ? "Unable to load affiliate data. Apply the affiliate migration if you have not already."
        : null,
  };
}
