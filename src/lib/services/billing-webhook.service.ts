import "server-only";

import type Stripe from "stripe";
import type { PackagePlan } from "@/lib/billing/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/utils/log-server-error";

export function isPackagePlan(value: string | null | undefined): value is PackagePlan {
  return value === "QUARTERLY" || value === "HALF_YEAR" || value === "YEARLY";
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }
  return session.payment_intent?.id ?? null;
}

export async function recordPackagePayment(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organization_id ?? session.client_reference_id ?? "";
  const plan = session.metadata?.plan;
  if (!organizationId || !isPackagePlan(plan)) {
    throw new Error("Checkout session is missing the church or package.");
  }

  const locationCount = Number(session.metadata?.location_count ?? "0");
  const subscriptionCents = Number(session.metadata?.subscription_cents ?? "0");
  const setupCents = Number(session.metadata?.setup_cents ?? "0");
  const branchSetupCount = Number(session.metadata?.branch_setup_count ?? "0");
  const includesHeadquarters = session.metadata?.includes_headquarters === "true";
  const periodEnd = session.metadata?.period_end || null;
  const amountCents = session.amount_total ?? subscriptionCents + setupCents;
  const paidAt = new Date().toISOString();
  const admin = createAdminClient();

  const existing = await admin
    .from("package_payments")
    .select("id, status, organization_id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  const row = existing.data as { id: string; status: string; organization_id: string } | null;
  if (row && row.organization_id !== organizationId) {
    throw new Error("Checkout session does not match the stored church.");
  }
  if (row?.status === "PAID") {
    return;
  }

  const payment = {
    organization_id: organizationId,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId(session),
    plan,
    location_count: locationCount > 0 ? locationCount : 1,
    currency: session.currency ?? "usd",
    amount_cents: amountCents,
    subscription_cents: subscriptionCents,
    setup_cents: setupCents,
    status: "PAID" as const,
    period_end: periodEnd,
    includes_headquarters: includesHeadquarters,
    branch_setup_count: branchSetupCount,
    paid_at: paidAt,
  };

  const saved = row
    ? await admin.from("package_payments").update(payment as never).eq("id", row.id).select("id").single()
    : await admin.from("package_payments").insert(payment as never).select("id").single();

  if (saved.error || !saved.data) {
    throw saved.error ?? new Error("Package payment could not be saved.");
  }

  const billingResult = await admin
    .from("organization_billing")
    .select("headquarters_paid, branches_setup, stripe_customer_id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (billingResult.error) {
    throw billingResult.error;
  }

  const billing = billingResult.data as {
    headquarters_paid: boolean;
    branches_setup: number;
    stripe_customer_id: string | null;
  } | null;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? billing?.stripe_customer_id ?? null;

  const { error: billingError } = await admin.from("organization_billing").upsert(
    {
      organization_id: organizationId,
      stripe_customer_id: customerId,
      plan,
      location_count: locationCount > 0 ? locationCount : 1,
      status: "ACTIVE",
      current_period_end: periodEnd,
      headquarters_paid: Boolean(billing?.headquarters_paid) || includesHeadquarters,
      branches_setup: (billing?.branches_setup ?? 0) + branchSetupCount,
      updated_at: paidAt,
    } as never,
    { onConflict: "organization_id" },
  );

  if (billingError) {
    throw billingError;
  }

  const paymentId = String((saved.data as { id: string }).id);
  const { error: auditError } = await admin.from("audit_logs").insert({
    organization_id: organizationId,
    action: "PACKAGE_PAYMENT_RECORDED",
    entity_type: "package_payment",
    entity_id: paymentId,
    metadata: {
      plan,
      amount_cents: amountCents,
      stripe_checkout_session_id: session.id,
      source: "stripe_webhook",
    },
  } as never);

  if (auditError) {
    logServerError("billing.webhook.audit", auditError);
  }
}

export async function markPackageCheckoutFailed(sessionId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("package_payments")
    .update({ status: "FAILED" } as never)
    .eq("stripe_checkout_session_id", sessionId)
    .eq("status", "PENDING");

  if (error) {
    throw error;
  }
}

export async function markPackagePaymentRefunded(paymentIntentId: string) {
  const admin = createAdminClient();
  const paymentResult = await admin
    .from("package_payments")
    .select("id, organization_id, period_end, status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (paymentResult.error) {
    throw paymentResult.error;
  }

  const payment = paymentResult.data as {
    id: string;
    organization_id: string;
    period_end: string | null;
    status: string;
  } | null;
  if (!payment || payment.status === "REFUNDED") {
    return;
  }

  const { error } = await admin.from("package_payments").update({ status: "REFUNDED" } as never).eq("id", payment.id);
  if (error) {
    throw error;
  }

  const billingResult = await admin
    .from("organization_billing")
    .select("current_period_end")
    .eq("organization_id", payment.organization_id)
    .maybeSingle();
  const billing = billingResult.data as { current_period_end: string | null } | null;
  if (billing?.current_period_end && billing.current_period_end === payment.period_end) {
    await admin
      .from("organization_billing")
      .update({ status: "PAST_DUE", updated_at: new Date().toISOString() } as never)
      .eq("organization_id", payment.organization_id);
  }
}
