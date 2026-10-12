import "server-only";

import { headers } from "next/headers";
import { requireRole } from "@/lib/auth/require-role";
import {
  packagePlanLabel,
  quotePackage,
  type BillingCheckoutQuote,
  type PackagePlan,
  type PackageQuote,
} from "@/lib/billing/plans";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { markPackageCheckoutFailed, recordPackagePayment } from "@/lib/services/billing-webhook.service";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/log-server-error";

export type BillingAccount = {
  plan: PackagePlan | null;
  locationCount: number;
  status: "UNPAID" | "ACTIVE" | "PAST_DUE";
  currentPeriodEnd: string | null;
  headquartersPaid: boolean;
  branchesSetup: number;
};

export type BillingPayment = {
  id: string;
  plan: PackagePlan;
  locationCount: number;
  currency: string;
  amountCents: number;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  periodEnd: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type PackageBillingView = {
  unavailable: boolean;
  configured: boolean;
  account: BillingAccount | null;
  payments: BillingPayment[];
  quotes: BillingCheckoutQuote[];
  quoteError: string | null;
};

type BillingRow = {
  plan: string | null;
  location_count: number;
  status: string;
  current_period_end: string | null;
  headquarters_paid: boolean;
  branches_setup: number;
  stripe_customer_id: string | null;
};

function isPackagePlan(value: string | null | undefined): value is PackagePlan {
  return value === "QUARTERLY" || value === "HALF_YEAR" || value === "YEARLY";
}

function missingTable(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }
  return error.code === "PGRST205" || error.code === "42P01" || /organization_billing|package_payments/i.test(error.message ?? "");
}

async function loadQuoteContext(organizationId: string) {
  const supabase = await createClient();
  const [billingResult, locationsResult, membersResult] = await Promise.all([
    supabase
      .from("organization_billing")
      .select("plan, location_count, status, current_period_end, headquarters_paid, branches_setup, stripe_customer_id")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("locations")
      .select("id, created_at")
      .eq("organization_id", organizationId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: true }),
    supabase.from("members").select("location_id").eq("organization_id", organizationId),
  ]);

  return { billingResult, locationsResult, membersResult };
}

function buildQuotes(billing: BillingRow | null, memberCounts: number[], periodStart: Date) {
  const locationCount = Math.max(memberCounts.length, 1);
  const branchesSetup = billing?.branches_setup ?? 0;
  const uncovered = memberCounts.slice(branchesSetup);
  const newBranchMemberCounts = memberCounts.length === 0 && branchesSetup === 0 ? [0] : uncovered;
  const quotes: PackageQuote[] = [];
  let quoteError: string | null = null;

  for (const plan of ["QUARTERLY", "HALF_YEAR", "YEARLY"] as const) {
    const quote = quotePackage({
      plan,
      locationCount,
      newBranchMemberCounts,
      includeHeadquarters: !billing?.headquarters_paid,
      periodStart,
    });
    if ("error" in quote) {
      quoteError = quote.error;
      break;
    }
    quotes.push(quote);
  }

  return { quotes, quoteError, locationCount };
}

async function reconcilePendingPayments(organizationId: string) {
  const stripe = getStripe();
  if (!stripe) {
    return;
  }

  const admin = createAdminClient();
  const pending = await admin
    .from("package_payments")
    .select("stripe_checkout_session_id")
    .eq("organization_id", organizationId)
    .eq("status", "PENDING");

  if (pending.error) {
    logServerError("billing.reconcile", pending.error);
    return;
  }

  for (const row of (pending.data ?? []) as Array<{ stripe_checkout_session_id: string }>) {
    try {
      const session = await stripe.checkout.sessions.retrieve(row.stripe_checkout_session_id);
      if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
        await recordPackagePayment(session);
      } else if (session.status === "expired") {
        await markPackageCheckoutFailed(session.id);
      }
    } catch (error) {
      logServerError("billing.reconcile", error);
    }
  }
}

export async function getPackageBilling(): Promise<PackageBillingView> {
  const current = await requireRole("SUPER_ADMIN");
  const configured = isStripeConfigured();
  await reconcilePendingPayments(current.organizationId);
  const loaded = await loadQuoteContext(current.organizationId);

  if (missingTable(loaded.billingResult.error) || missingTable(loaded.locationsResult.error)) {
    if (loaded.billingResult.error) {
      logServerError("billing.load", loaded.billingResult.error);
    }
    return {
      unavailable: true,
      configured,
      account: null,
      payments: [],
      quotes: [],
      quoteError: null,
    };
  }

  const billing = (loaded.billingResult.data ?? null) as BillingRow | null;
  const locations = (loaded.locationsResult.data ?? []) as Array<{ id: string }>;
  const members = (loaded.membersResult.data ?? []) as Array<{ location_id: string }>;
  const counts = new Map<string, number>();
  for (const member of members) {
    counts.set(member.location_id, (counts.get(member.location_id) ?? 0) + 1);
  }
  const memberCounts = locations.map((location) => counts.get(location.id) ?? 0);
  const periodStart =
    billing?.status === "ACTIVE" && billing.current_period_end && new Date(billing.current_period_end) > new Date()
      ? new Date(billing.current_period_end)
      : new Date();
  const { quotes, quoteError } = buildQuotes(billing, memberCounts, periodStart);

  const paymentsResult = await (await createClient())
    .from("package_payments")
    .select("id, plan, location_count, currency, amount_cents, status, period_end, created_at, paid_at")
    .eq("organization_id", current.organizationId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (paymentsResult.error && !missingTable(paymentsResult.error)) {
    logServerError("billing.payments", paymentsResult.error);
  }

  const payments = ((paymentsResult.data ?? []) as Array<Record<string, unknown>>)
    .filter((row) => isPackagePlan(String(row.plan)))
    .map((row) => ({
      id: String(row.id),
      plan: row.plan as PackagePlan,
      locationCount: Number(row.location_count),
      currency: String(row.currency),
      amountCents: Number(row.amount_cents),
      status: row.status as BillingPayment["status"],
      periodEnd: row.period_end ? String(row.period_end) : null,
      createdAt: String(row.created_at),
      paidAt: row.paid_at ? String(row.paid_at) : null,
    }));

  return {
    unavailable: false,
    configured,
    account: billing
      ? {
          plan: isPackagePlan(billing.plan) ? billing.plan : null,
          locationCount: billing.location_count,
          status: billing.status === "ACTIVE" || billing.status === "PAST_DUE" ? billing.status : "UNPAID",
          currentPeriodEnd: billing.current_period_end,
          headquartersPaid: billing.headquarters_paid,
          branchesSetup: billing.branches_setup,
        }
      : {
          plan: null,
          locationCount: 0,
          status: "UNPAID",
          currentPeriodEnd: null,
          headquartersPaid: false,
          branchesSetup: 0,
        },
    payments,
    quotes: quotes.map((quote) => ({
      plan: quote.plan,
      label: packagePlanLabel(quote.plan),
      totalCents: quote.totalCents,
      detail: quoteDetail(quote),
    })),
    quoteError,
  };
}

function quoteDetail(quote: PackageQuote) {
  const locations = `${quote.locationCount} location${quote.locationCount === 1 ? "" : "s"}`;
  const discount = quote.discountPercent > 0 ? `, ${quote.discountPercent}% volume discount` : "";
  const setup = quote.setupCents > 0 ? " plus setup" : "";
  return `${locations}${discount}${setup}`;
}

async function requestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function createPackageCheckout(plan: PackagePlan) {
  const current = await requireRole("SUPER_ADMIN");
  const stripe = getStripe();
  if (!stripe) {
    return { error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY on the server." };
  }

  const loaded = await loadQuoteContext(current.organizationId);
  if (loaded.billingResult.error || loaded.locationsResult.error) {
    logServerError("billing.checkout", loaded.billingResult.error ?? loaded.locationsResult.error);
    return { error: "Package billing is not available yet." };
  }

  const billing = (loaded.billingResult.data ?? null) as BillingRow | null;
  const locations = (loaded.locationsResult.data ?? []) as Array<{ id: string }>;
  const members = (loaded.membersResult.data ?? []) as Array<{ location_id: string }>;
  const counts = new Map<string, number>();
  for (const member of members) {
    counts.set(member.location_id, (counts.get(member.location_id) ?? 0) + 1);
  }
  const memberCounts = locations.map((location) => counts.get(location.id) ?? 0);
  const periodStart =
    billing?.status === "ACTIVE" && billing.current_period_end && new Date(billing.current_period_end) > new Date()
      ? new Date(billing.current_period_end)
      : new Date();
  const { quotes } = buildQuotes(billing, memberCounts, periodStart);
  const quote = quotes.find((item) => item.plan === plan);
  if (!quote) {
    return { error: "251 or more locations are priced by agreement. Contact support before paying." };
  }

  const admin = createAdminClient();
  let customerId = billing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: current.organizationName,
      email: current.email,
      metadata: { organization_id: current.organizationId },
    });
    customerId = customer.id;
    const { error } = await admin.from("organization_billing").upsert(
      {
        organization_id: current.organizationId,
        stripe_customer_id: customerId,
        status: billing?.status ?? "UNPAID",
        headquarters_paid: billing?.headquarters_paid ?? false,
        branches_setup: billing?.branches_setup ?? 0,
        location_count: billing?.location_count ?? 0,
        plan: billing?.plan ?? null,
        current_period_end: billing?.current_period_end ?? null,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "organization_id" },
    );
    if (error) {
      logServerError("billing.customer", error);
      return { error: "The Stripe customer could not be saved." };
    }
  }

  const origin = await requestOrigin();
  const lineItems: Array<{
    quantity: number;
    price_data: {
      currency: "usd";
      unit_amount: number;
      product_data: { name: string; description?: string };
    };
  }> = [
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: quote.subscriptionCents,
        product_data: {
          name: `${packagePlanLabel(plan)} package`,
          description: `${quote.locationCount} location${quote.locationCount === 1 ? "" : "s"}${
            quote.discountPercent > 0 ? `, ${quote.discountPercent}% volume discount` : ""
          }`,
        },
      },
    },
  ];

  if (quote.headquartersCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: quote.headquartersCents,
        product_data: { name: "Headquarters setup and onboarding" },
      },
    });
  }

  const branchGroups = new Map<number, number>();
  for (const amount of quote.branchSetupCents) {
    branchGroups.set(amount, (branchGroups.get(amount) ?? 0) + 1);
  }
  for (const [amount, quantity] of branchGroups) {
    lineItems.push({
      quantity,
      price_data: {
        currency: "usd",
        unit_amount: amount,
        product_data: { name: "Branch setup" },
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: current.organizationId,
    success_url: `${origin}/admin/dashboard?billing=success`,
    cancel_url: `${origin}/admin/dashboard?billing=cancelled`,
    metadata: {
      organization_id: current.organizationId,
      plan,
      location_count: String(quote.locationCount),
      period_end: quote.periodEnd,
      includes_headquarters: quote.headquartersCents > 0 ? "true" : "false",
      branch_setup_count: String(quote.branchSetupCents.length),
      subscription_cents: String(quote.subscriptionCents),
      setup_cents: String(quote.setupCents),
    },
    line_items: lineItems,
  });

  if (!session.url) {
    return { error: "Stripe did not return a checkout page." };
  }

  const { error: paymentError } = await admin.from("package_payments").insert({
    organization_id: current.organizationId,
    stripe_checkout_session_id: session.id,
    plan,
    location_count: quote.locationCount,
    currency: "usd",
    amount_cents: quote.totalCents,
    subscription_cents: quote.subscriptionCents,
    setup_cents: quote.setupCents,
    status: "PENDING",
    period_end: quote.periodEnd,
    includes_headquarters: quote.headquartersCents > 0,
    branch_setup_count: quote.branchSetupCents.length,
  } as never);

  if (paymentError) {
    logServerError("billing.pending", paymentError);
  }

  await writeAuditLog({
    action: "PACKAGE_CHECKOUT_STARTED",
    entityType: "organization",
    entityId: current.organizationId,
    metadata: {
      plan,
      amount_cents: quote.totalCents,
      stripe_checkout_session_id: session.id,
    },
  });

  return { url: session.url };
}
