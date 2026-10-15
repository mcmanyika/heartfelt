import "server-only";

import { headers } from "next/headers";
import type Stripe from "stripe";
import { requireRole } from "@/lib/auth/require-role";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/log-server-error";
import { memberGivingCheckoutSchema } from "@/lib/validators/member-giving.schema";

export type MemberGivingCategory = {
  id: string;
  name: string;
};

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }
  return session.payment_intent?.id ?? null;
}

function stripeNote(paymentIntent: string | null) {
  return paymentIntent ? `Stripe ${paymentIntent}` : "Stripe";
}

async function requestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function currentMember() {
  const current = await requireRole("MEMBER");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, location_id, organization_id")
    .eq("profile_id", current.id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("member-giving.member", error);
  }

  const member = data as { id: string; location_id: string; organization_id: string } | null;
  return { current, member };
}

export async function getMemberGivingOptions() {
  const { current, member } = await currentMember();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("giving_categories")
    .select("id, name")
    .eq("organization_id", current.organizationId)
    .eq("active", true)
    .order("name");

  if (error) {
    logServerError("member-giving.categories", error);
  }

  return {
    configured: isStripeConfigured(),
    canGive: Boolean(member?.location_id),
    categories: ((data ?? []) as MemberGivingCategory[]).map((category) => ({
      id: category.id,
      name: category.name,
    })),
  };
}

export async function recordMemberGivingPayment(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== "member_giving") {
    return;
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return;
  }

  const organizationId = session.metadata.organization_id ?? "";
  const memberId = session.metadata.member_id ?? "";
  const locationId = session.metadata.location_id ?? "";
  const categoryId = session.metadata.giving_category_id ?? "";
  if (!organizationId || !memberId || !locationId || !categoryId) {
    throw new Error("Giving checkout is missing the member or category.");
  }

  const admin = createAdminClient();
  const existing = await admin
    .from("giving_transactions")
    .select("id, status, organization_id, member_id, amount, currency")
    .eq("transaction_reference", session.id)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  const row = existing.data as {
    id: string;
    status: string;
    organization_id: string;
    member_id: string;
    amount: number;
    currency: string;
  } | null;

  if (row && (row.organization_id !== organizationId || row.member_id !== memberId)) {
    throw new Error("Giving checkout does not match the stored member.");
  }
  if (row?.status === "SUCCESS" || row?.status === "REFUNDED") {
    return;
  }

  const intentId = paymentIntentId(session);
  const paidAt = new Date().toISOString();

  if (row) {
    const amountCents = Math.round(Number(row.amount) * 100);
    if (session.amount_total != null && session.amount_total !== amountCents) {
      throw new Error("Paid amount does not match the giving record.");
    }
    if (session.currency && session.currency !== row.currency.toLowerCase()) {
      throw new Error("Paid currency does not match the giving record.");
    }

    const { error } = await admin
      .from("giving_transactions")
      .update({ status: "SUCCESS", notes: stripeNote(intentId), updated_at: paidAt } as never)
      .eq("id", row.id)
      .eq("member_id", memberId);

    if (error) {
      throw error;
    }
  } else {
    const amountCents = session.amount_total ?? 0;
    if (amountCents <= 0 || !session.currency) {
      throw new Error("Giving checkout has no amount.");
    }

    const memberResult = await admin
      .from("members")
      .select("id, organization_id, location_id")
      .eq("id", memberId)
      .maybeSingle();
    const storedMember = memberResult.data as { id: string; organization_id: string; location_id: string } | null;
    if (memberResult.error || !storedMember || storedMember.organization_id !== organizationId || storedMember.location_id !== locationId) {
      throw memberResult.error ?? new Error("Giving checkout member does not match this church.");
    }

    const { error } = await admin.from("giving_transactions").insert({
      organization_id: organizationId,
      location_id: locationId,
      member_id: memberId,
      giving_category_id: categoryId,
      amount: amountCents / 100,
      currency: session.currency.toUpperCase(),
      payment_method: "CARD",
      transaction_reference: session.id,
      status: "SUCCESS",
      notes: stripeNote(intentId),
    } as never);

    if (error) {
      throw error;
    }
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    organization_id: organizationId,
    action: "MEMBER_GIVING_RECORDED",
    entity_type: "giving_transaction",
    metadata: {
      member_id: memberId,
      stripe_checkout_session_id: session.id,
      source: "stripe",
    },
  } as never);
  if (auditError) {
    logServerError("member-giving.audit", auditError);
  }
}

export async function markMemberGivingFailed(sessionId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("giving_transactions")
    .update({ status: "FAILED", updated_at: new Date().toISOString() } as never)
    .eq("transaction_reference", sessionId)
    .eq("status", "PENDING");

  if (error) {
    throw error;
  }
}

export async function markMemberGivingRefunded(paymentIntentId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("giving_transactions")
    .update({ status: "REFUNDED", updated_at: new Date().toISOString() } as never)
    .eq("notes", stripeNote(paymentIntentId))
    .eq("status", "SUCCESS");

  if (error) {
    throw error;
  }
}

export async function reconcileMyPendingGiving() {
  const stripe = getStripe();
  if (!stripe) {
    return;
  }

  const { current, member } = await currentMember();
  if (!member) {
    return;
  }

  const admin = createAdminClient();
  const pending = await admin
    .from("giving_transactions")
    .select("transaction_reference")
    .eq("organization_id", current.organizationId)
    .eq("member_id", member.id)
    .eq("status", "PENDING")
    .like("transaction_reference", "cs_%");

  if (pending.error) {
    logServerError("member-giving.reconcile", pending.error);
    return;
  }

  for (const row of (pending.data ?? []) as Array<{ transaction_reference: string }>) {
    try {
      const session = await stripe.checkout.sessions.retrieve(row.transaction_reference);
      if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
        await recordMemberGivingPayment(session);
      } else if (session.status === "expired") {
        await markMemberGivingFailed(session.id);
      }
    } catch (error) {
      logServerError("member-giving.reconcile", error);
    }
  }
}

export async function cancelMyGivingCheckout(sessionId: string) {
  if (!sessionId.startsWith("cs_")) {
    return;
  }

  const { member } = await currentMember();
  if (!member) {
    return;
  }

  const stripe = getStripe();
  const admin = createAdminClient();
  const existing = await admin
    .from("giving_transactions")
    .select("id, status")
    .eq("transaction_reference", sessionId)
    .eq("member_id", member.id)
    .maybeSingle();

  if (existing.error) {
    logServerError("member-giving.cancel", existing.error);
    return;
  }

  const row = existing.data as { id: string; status: string } | null;
  if (!row || row.status !== "PENDING") {
    return;
  }

  if (stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
        await recordMemberGivingPayment(session);
        return;
      }
    } catch (error) {
      logServerError("member-giving.cancel", error);
    }
  }

  const { error } = await admin
    .from("giving_transactions")
    .update({ status: "FAILED", updated_at: new Date().toISOString() } as never)
    .eq("id", row.id)
    .eq("member_id", member.id)
    .eq("status", "PENDING");

  if (error) {
    logServerError("member-giving.cancel", error);
  }
}

export async function createMemberGivingCheckout(input: unknown) {
  const parsed = memberGivingCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the gift and try again." };
  }

  const { current, member } = await currentMember();
  if (!member?.location_id) {
    return { error: "Your membership is not linked to a campus yet." };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { error: "Stripe is not configured yet." };
  }

  const supabase = await createClient();
  const categoryResult = await supabase
    .from("giving_categories")
    .select("id, name, active")
    .eq("id", parsed.data.giving_category_id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  const category = categoryResult.data as { id: string; name: string; active: boolean } | null;
  if (categoryResult.error || !category?.active) {
    return { error: "Select an active giving category." };
  }

  const amount = Number(parsed.data.amount);
  const amountCents = Math.round(amount * 100);
  const origin = await requestOrigin();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: current.email,
      client_reference_id: member.id,
      success_url: `${origin}/member/dashboard?giving=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/member/dashboard?giving=cancelled&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        kind: "member_giving",
        organization_id: current.organizationId,
        member_id: member.id,
        location_id: member.location_id,
        giving_category_id: category.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: parsed.data.currency.toLowerCase(),
            unit_amount: amountCents,
            product_data: { name: category.name },
          },
        },
      ],
    });
  } catch (error) {
    logServerError("member-giving.checkout", error);
    return { error: "Stripe could not start this payment." };
  }

  if (!session.url) {
    return { error: "Stripe did not return a checkout page." };
  }

  const admin = createAdminClient();
  const { error: insertError } = await admin.from("giving_transactions").insert({
    organization_id: current.organizationId,
    location_id: member.location_id,
    member_id: member.id,
    giving_category_id: category.id,
    amount,
    currency: parsed.data.currency,
    payment_method: "CARD",
    transaction_reference: session.id,
    status: "PENDING",
    notes: "Stripe",
    created_by: current.id,
  } as never);

  if (insertError) {
    logServerError("member-giving.pending", insertError);
    return { error: "The gift could not be saved. No payment was taken." };
  }

  await writeAuditLog({
    action: "MEMBER_GIVING_CHECKOUT_STARTED",
    entityType: "giving_transaction",
    metadata: {
      member_id: member.id,
      amount,
      currency: parsed.data.currency,
      stripe_checkout_session_id: session.id,
    },
  });

  return { url: session.url };
}
