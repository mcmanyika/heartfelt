import "server-only";

import { cookies } from "next/headers";
import {
  AFFILIATE_COMMISSION_RATE_BPS,
  AFFILIATE_REFERRAL_COOKIE,
  AFFILIATE_REFERRAL_COOKIE_MAX_AGE,
  AFFILIATE_SPLIT_RATE_BPS,
  affiliateCommissionCents,
} from "@/lib/affiliate/constants";
import { requireRole } from "@/lib/auth/require-role";
import { requireUser } from "@/lib/auth/require-user";
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
  rateBps: number;
};

export type AffiliateReferralRow = {
  referredOrganizationId: string;
  referredOrganizationName: string;
  referralCode: string;
  createdAt: string;
};

type ResolvedReferrer = {
  referralCode: string;
  referrerOrganizationId: string;
  referrerProfileId: string | null;
};

function normalizeReferralCode(value: string | null | undefined) {
  const code = value?.trim().toLowerCase() ?? "";
  return code && isValidTenantSlug(code) ? code : null;
}

async function resolveReferrer(rawCode: string | null | undefined): Promise<{
  referrer: ResolvedReferrer | null;
  error?: string;
}> {
  const code = normalizeReferralCode(rawCode) ?? (await readReferralCodeFromCookie());
  if (!code) {
    return { referrer: null };
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, organization_id, referral_code")
    .eq("referral_code", code)
    .maybeSingle();

  if (profileError) {
    logServerError("affiliate.resolve.profile", profileError);
    return { referrer: null, error: "Unable to resolve that referral." };
  }

  if (profile) {
    const row = profile as {
      id: string;
      organization_id: string;
      referral_code: string;
    };
    return {
      referrer: {
        referralCode: row.referral_code,
        referrerOrganizationId: row.organization_id,
        referrerProfileId: row.id,
      },
    };
  }

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, slug")
    .or(`slug.eq.${code},short_code.eq.${code.toUpperCase()}`)
    .maybeSingle();

  if (orgError) {
    logServerError("affiliate.resolve.org", orgError);
    return { referrer: null, error: "Unable to resolve that referral." };
  }
  if (!org) {
    return { referrer: null };
  }

  const orgRow = org as { id: string; slug: string };
  return {
    referrer: {
      referralCode: orgRow.slug,
      referrerOrganizationId: orgRow.id,
      referrerProfileId: null,
    },
  };
}

export async function captureReferralCode(rawCode: string | null | undefined) {
  const code = normalizeReferralCode(rawCode);
  if (!code) {
    return { error: "That referral code is not valid." };
  }

  const resolved = await resolveReferrer(code);
  if (resolved.error) {
    return { error: resolved.error };
  }
  if (!resolved.referrer) {
    return { error: "No account matches that referral code." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AFFILIATE_REFERRAL_COOKIE, resolved.referrer.referralCode, {
    path: "/",
    sameSite: "lax",
    maxAge: AFFILIATE_REFERRAL_COOKIE_MAX_AGE,
  });

  return { ok: true as const, code: resolved.referrer.referralCode };
}

export async function readReferralCodeFromCookie() {
  const cookieStore = await cookies();
  return normalizeReferralCode(cookieStore.get(AFFILIATE_REFERRAL_COOKIE)?.value);
}

export async function clearReferralCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AFFILIATE_REFERRAL_COOKIE);
}

export async function recordOrganizationReferral(input: {
  referredOrganizationId: string;
  referralCode?: string | null;
}) {
  const resolved = await resolveReferrer(input.referralCode);
  if (resolved.error) {
    return { error: resolved.error };
  }
  if (!resolved.referrer) {
    return { ok: true as const, recorded: false as const };
  }
  if (resolved.referrer.referrerOrganizationId === input.referredOrganizationId) {
    return { ok: true as const, recorded: false as const };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("organization_referrals").insert({
    referred_organization_id: input.referredOrganizationId,
    referrer_organization_id: resolved.referrer.referrerOrganizationId,
    referrer_profile_id: resolved.referrer.referrerProfileId,
    referral_code: resolved.referrer.referralCode,
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
    referrerOrganizationId: resolved.referrer.referrerOrganizationId,
    referrerProfileId: resolved.referrer.referrerProfileId,
  };
}

async function insertCommissionRow(input: {
  referrerOrganizationId?: string | null;
  referrerProfileId?: string | null;
  referredOrganizationId: string;
  packagePaymentId: string;
  setupCents: number;
  rateBps: number;
  currency: string;
}) {
  const admin = createAdminClient();
  const commissionCents = affiliateCommissionCents(input.setupCents, input.rateBps);
  const { error } = await admin.from("affiliate_commissions").insert({
    referrer_organization_id: input.referrerOrganizationId ?? null,
    referrer_profile_id: input.referrerProfileId ?? null,
    referred_organization_id: input.referredOrganizationId,
    package_payment_id: input.packagePaymentId,
    setup_cents: input.setupCents,
    rate_bps: input.rateBps,
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
    .select("referrer_organization_id, referrer_profile_id")
    .eq("referred_organization_id", input.referredOrganizationId)
    .maybeSingle();

  if (referralError) {
    logServerError("affiliate.commission.referral", referralError);
    return;
  }
  if (!referral) {
    return;
  }

  const row = referral as {
    referrer_organization_id: string;
    referrer_profile_id: string | null;
  };

  if (row.referrer_profile_id) {
    await insertCommissionRow({
      referrerProfileId: row.referrer_profile_id,
      referredOrganizationId: input.referredOrganizationId,
      packagePaymentId: input.packagePaymentId,
      setupCents: input.setupCents,
      rateBps: AFFILIATE_SPLIT_RATE_BPS,
      currency: input.currency,
    });
    await insertCommissionRow({
      referrerOrganizationId: row.referrer_organization_id,
      referredOrganizationId: input.referredOrganizationId,
      packagePaymentId: input.packagePaymentId,
      setupCents: input.setupCents,
      rateBps: AFFILIATE_SPLIT_RATE_BPS,
      currency: input.currency,
    });
    return;
  }

  await insertCommissionRow({
    referrerOrganizationId: row.referrer_organization_id,
    referredOrganizationId: input.referredOrganizationId,
    packagePaymentId: input.packagePaymentId,
    setupCents: input.setupCents,
    rateBps: AFFILIATE_COMMISSION_RATE_BPS,
    currency: input.currency,
  });
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

async function mapNames(ids: string[]) {
  const nameById = new Map<string, string>();
  if (ids.length === 0) {
    return nameById;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").select("id, name").in("id", ids);
  if (error) {
    logServerError("affiliate.referredNames", error);
    return nameById;
  }
  for (const row of (data ?? []) as Array<{ id: string; name: string }>) {
    nameById.set(row.id, row.name);
  }
  return nameById;
}

function mapCommissionRows(
  rows: Array<Record<string, unknown>>,
  nameById: Map<string, string>,
): AffiliateCommissionRow[] {
  return rows.map((row) => {
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
      rateBps: Number(row.rate_bps ?? AFFILIATE_COMMISSION_RATE_BPS),
    };
  });
}

function mapReferralRows(
  rows: Array<Record<string, unknown>>,
  nameById: Map<string, string>,
): AffiliateReferralRow[] {
  return rows.map((row) => {
    const id = String(row.referred_organization_id);
    return {
      referredOrganizationId: id,
      referredOrganizationName: nameById.get(id) ?? "Church",
      referralCode: String(row.referral_code),
      createdAt: String(row.created_at),
    };
  });
}

function sumCommissionBuckets(commissions: AffiliateCommissionRow[]) {
  const pendingCents = commissions
    .filter((row) => row.status === "PENDING" || row.status === "APPROVED")
    .reduce((sum, row) => sum + row.commissionCents, 0);
  const paidCents = commissions
    .filter((row) => row.status === "PAID")
    .reduce((sum, row) => sum + row.commissionCents, 0);
  return { pendingCents, paidCents };
}

export async function getPersonalAffiliateDashboard() {
  const current = await requireUser();
  const supabase = await createClient();

  const [profileResult, referralsResult, commissionsResult] = await Promise.all([
    supabase.from("profiles").select("referral_code").eq("id", current.id).maybeSingle(),
    supabase
      .from("organization_referrals")
      .select("referred_organization_id, referral_code, created_at")
      .eq("referrer_profile_id", current.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("affiliate_commissions")
      .select(
        "id, referred_organization_id, package_payment_id, setup_cents, commission_cents, currency, status, created_at, paid_at, rate_bps",
      )
      .eq("referrer_profile_id", current.id)
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error) {
    logServerError("affiliate.personal.profile", profileResult.error);
  }
  if (referralsResult.error) {
    logServerError("affiliate.personal.referrals", referralsResult.error);
  }
  if (commissionsResult.error) {
    logServerError("affiliate.personal.commissions", commissionsResult.error);
  }

  const referralCode = String(
    (profileResult.data as { referral_code?: string } | null)?.referral_code ?? "",
  );
  const shareUrl = referralCode
    ? `${apexOrigin()}/start?ref=${encodeURIComponent(referralCode)}`
    : "";

  const referralRows = (referralsResult.data ?? []) as Array<Record<string, unknown>>;
  const commissionRows = (commissionsResult.data ?? []) as Array<Record<string, unknown>>;
  const referredIds = [
    ...new Set([
      ...referralRows.map((row) => String(row.referred_organization_id)),
      ...commissionRows.map((row) => String(row.referred_organization_id)),
    ]),
  ];
  const nameById = await mapNames(referredIds);
  const referrals = mapReferralRows(referralRows, nameById);
  const commissions = mapCommissionRows(commissionRows, nameById);
  const { pendingCents, paidCents } = sumCommissionBuckets(commissions);

  return {
    referralCode,
    shareUrl,
    referrals,
    commissions,
    pendingCents,
    paidCents,
    splitRatePercent: AFFILIATE_SPLIT_RATE_BPS / 100,
    totalRatePercent: AFFILIATE_COMMISSION_RATE_BPS / 100,
    error:
      profileResult.error || referralsResult.error || commissionsResult.error
        ? "Unable to load referral data. Apply the affiliate profile migration if you have not already."
        : null,
  };
}

export async function getAffiliateDashboard() {
  const current = await requireRole("SUPER_ADMIN");
  const supabase = await createClient();
  const organizationId = current.organizationId;

  const [orgResult, profileResult, referralsResult, commissionsResult] = await Promise.all([
    supabase.from("organizations").select("slug, short_code, name").eq("id", organizationId).maybeSingle(),
    supabase.from("profiles").select("referral_code").eq("id", current.id).maybeSingle(),
    supabase
      .from("organization_referrals")
      .select("referred_organization_id, referral_code, created_at")
      .eq("referrer_organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("affiliate_commissions")
      .select(
        "id, referred_organization_id, package_payment_id, setup_cents, commission_cents, currency, status, created_at, paid_at, rate_bps",
      )
      .eq("referrer_organization_id", organizationId)
      .order("created_at", { ascending: false }),
  ]);

  if (orgResult.error) {
    logServerError("affiliate.dashboard.org", orgResult.error);
  }
  if (profileResult.error) {
    logServerError("affiliate.dashboard.profile", profileResult.error);
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
  const personalReferralCode = String(
    (profileResult.data as { referral_code?: string } | null)?.referral_code ?? "",
  );
  const personalShareUrl = personalReferralCode
    ? `${apexOrigin()}/start?ref=${encodeURIComponent(personalReferralCode)}`
    : "";

  const referralRows = (referralsResult.data ?? []) as Array<Record<string, unknown>>;
  const commissionRows = (commissionsResult.data ?? []) as Array<Record<string, unknown>>;
  const referredIds = [
    ...new Set([
      ...referralRows.map((row) => String(row.referred_organization_id)),
      ...commissionRows.map((row) => String(row.referred_organization_id)),
    ]),
  ];
  const nameById = await mapNames(referredIds);
  const referrals = mapReferralRows(referralRows, nameById);
  const commissions = mapCommissionRows(commissionRows, nameById);
  const { pendingCents, paidCents } = sumCommissionBuckets(commissions);

  return {
    referralCode,
    shareUrl,
    churchOrigin,
    personalReferralCode,
    personalShareUrl,
    organizationName: org?.name ?? current.organizationName,
    referrals,
    commissions,
    pendingCents,
    paidCents,
    ratePercent: AFFILIATE_COMMISSION_RATE_BPS / 100,
    splitRatePercent: AFFILIATE_SPLIT_RATE_BPS / 100,
    error:
      referralsResult.error || commissionsResult.error
        ? "Unable to load affiliate data. Apply the affiliate migration if you have not already."
        : null,
  };
}
