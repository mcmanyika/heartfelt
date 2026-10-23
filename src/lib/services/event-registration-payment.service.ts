import "server-only";

import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { logServerError } from "@/lib/utils/log-server-error";

type PaidEventRow = {
  id: string;
  organization_id: string;
  location_id: string | null;
  title: string;
  start_date: string;
  registration_required: boolean;
  is_paid: boolean;
  price: number | null;
  currency: string | null;
  capacity: number | null;
};

type RegistrationRow = {
  id: string;
  status: string;
  stripe_checkout_session_id: string | null;
};

const EVENT_GIVING_CATEGORY_NAME = "Events";

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }
  return session.payment_intent?.id ?? null;
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
    .select("id, organization_id")
    .eq("profile_id", current.id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("event-payment.member", error);
  }

  return {
    current,
    member: data as { id: string; organization_id: string } | null,
  };
}

export async function createEventRegistrationCheckout(eventId: string) {
  const { current, member } = await currentMember();
  if (!member) {
    return { error: "Ask your campus office to link a membership record to your login." };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { error: "Online payments are not configured yet." };
  }

  const admin = createAdminClient();
  const eventResult = await admin
    .from("events")
    .select(
      "id, organization_id, location_id, title, start_date, registration_required, is_paid, price, currency, capacity",
    )
    .eq("id", eventId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (eventResult.error) {
    logServerError("event-payment.event", eventResult.error);
    return { error: "Unable to load that event." };
  }

  const event = eventResult.data as PaidEventRow | null;
  if (!event) {
    return { error: "That event is not available." };
  }
  if (!event.registration_required) {
    return { error: "This event does not take registrations." };
  }
  if (!event.is_paid || event.price == null || !event.currency) {
    return { error: "This event does not require online payment." };
  }
  if (new Date(event.start_date).getTime() < Date.now()) {
    return { error: "Event has already started." };
  }

  const existingResult = await admin
    .from("event_registrations")
    .select("id, status, stripe_checkout_session_id")
    .eq("event_id", eventId)
    .eq("member_id", member.id)
    .maybeSingle();

  if (existingResult.error) {
    logServerError("event-payment.existing", existingResult.error);
    return { error: "Unable to check your registration." };
  }

  const existing = existingResult.data as RegistrationRow | null;
  if (existing && (existing.status === "REGISTERED" || existing.status === "ATTENDED")) {
    return { error: "You are already registered for this event." };
  }

  if (event.capacity != null) {
    const { count, error: countError } = await admin
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .in("status", ["REGISTERED", "ATTENDED", "PENDING_PAYMENT"]);

    if (countError) {
      logServerError("event-payment.capacity", countError);
      return { error: "Unable to check event capacity." };
    }

    const holdingSeat =
      existing &&
      (existing.status === "PENDING_PAYMENT" ||
        existing.status === "REGISTERED" ||
        existing.status === "ATTENDED");
    if ((count ?? 0) >= event.capacity && !holdingSeat) {
      return { error: "Event is full." };
    }
  }

  const amount = Number(event.price);
  const amountCents = Math.round(amount * 100);
  if (amountCents <= 0) {
    return { error: "This event has an invalid ticket price." };
  }

  const origin = await requestOrigin();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: current.email,
      client_reference_id: member.id,
      success_url: `${origin}/member/events?registration=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/member/events?registration=cancelled&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        kind: "event_registration",
        organization_id: event.organization_id,
        event_id: event.id,
        member_id: member.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: event.currency.toLowerCase(),
            unit_amount: amountCents,
            product_data: { name: event.title },
          },
        },
      ],
    });
  } catch (error) {
    logServerError("event-payment.checkout", error);
    return { error: "Stripe could not start this payment." };
  }

  if (!session.url) {
    return { error: "Stripe did not return a checkout page." };
  }

  if (existing) {
    const { error: updateError } = await admin
      .from("event_registrations")
      .update({
        status: "PENDING_PAYMENT",
        amount,
        currency: event.currency,
        stripe_checkout_session_id: session.id,
        paid_at: null,
        registered_at: new Date().toISOString(),
      } as never)
      .eq("id", existing.id)
      .eq("member_id", member.id);

    if (updateError) {
      logServerError("event-payment.update", updateError);
      return { error: "Registration could not be saved. No payment was taken." };
    }
  } else {
    const { error: insertError } = await admin.from("event_registrations").insert({
      event_id: event.id,
      member_id: member.id,
      status: "PENDING_PAYMENT",
      amount,
      currency: event.currency,
      stripe_checkout_session_id: session.id,
    } as never);

    if (insertError) {
      logServerError("event-payment.insert", insertError);
      return { error: "Registration could not be saved. No payment was taken." };
    }
  }

  await writeAuditLog({
    action: "EVENT_REGISTRATION_CHECKOUT_STARTED",
    entityType: "event",
    entityId: event.id,
    metadata: {
      member_id: member.id,
      stripe_checkout_session_id: session.id,
      amount,
      currency: event.currency,
    },
  });

  return { url: session.url };
}

async function ensureEventsGivingCategory(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
) {
  const existing = await admin
    .from("giving_categories")
    .select("id, active")
    .eq("organization_id", organizationId)
    .eq("name", EVENT_GIVING_CATEGORY_NAME)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  const row = existing.data as { id: string; active: boolean } | null;
  if (row) {
    if (!row.active) {
      const { error } = await admin
        .from("giving_categories")
        .update({ active: true } as never)
        .eq("id", row.id);
      if (error) {
        throw error;
      }
    }
    return row.id;
  }

  const { data, error } = await admin
    .from("giving_categories")
    .insert({
      organization_id: organizationId,
      name: EVENT_GIVING_CATEGORY_NAME,
      description: "Paid event registration tickets",
      active: true,
    } as never)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return String((data as { id: string }).id);
}

async function recordEventRegistrationGiving(
  session: Stripe.Checkout.Session,
  params: {
    organizationId: string;
    eventId: string;
    memberId: string;
    amount: number;
    currency: string;
  },
) {
  const admin = createAdminClient();
  const existingGiving = await admin
    .from("giving_transactions")
    .select("id, status")
    .eq("organization_id", params.organizationId)
    .eq("transaction_reference", session.id)
    .maybeSingle();

  if (existingGiving.error) {
    throw existingGiving.error;
  }

  const givingRow = existingGiving.data as { id: string; status: string } | null;
  if (givingRow?.status === "SUCCESS" || givingRow?.status === "REFUNDED") {
    return;
  }

  const [eventResult, memberResult, categoryId] = await Promise.all([
    admin
      .from("events")
      .select("id, title, location_id, organization_id")
      .eq("id", params.eventId)
      .eq("organization_id", params.organizationId)
      .maybeSingle(),
    admin
      .from("members")
      .select("id, location_id, organization_id")
      .eq("id", params.memberId)
      .eq("organization_id", params.organizationId)
      .maybeSingle(),
    ensureEventsGivingCategory(admin, params.organizationId),
  ]);

  if (eventResult.error) {
    throw eventResult.error;
  }
  if (memberResult.error) {
    throw memberResult.error;
  }

  const event = eventResult.data as {
    id: string;
    title: string;
    location_id: string | null;
    organization_id: string;
  } | null;
  const member = memberResult.data as {
    id: string;
    location_id: string;
    organization_id: string;
  } | null;

  if (!event || !member) {
    throw new Error("Event registration payment is missing the event or member.");
  }

  const locationId = event.location_id ?? member.location_id;
  if (!locationId) {
    throw new Error("Event registration payment has no location to record giving against.");
  }

  const intentId = paymentIntentId(session);
  const notes = `Event registration: ${event.title}${intentId ? ` · Stripe ${intentId}` : ""}`;

  if (givingRow) {
    const { error } = await admin
      .from("giving_transactions")
      .update({
        status: "SUCCESS",
        amount: params.amount,
        currency: params.currency,
        notes,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", givingRow.id)
      .eq("member_id", params.memberId);

    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await admin.from("giving_transactions").insert({
    organization_id: params.organizationId,
    location_id: locationId,
    member_id: params.memberId,
    giving_category_id: categoryId,
    amount: params.amount,
    currency: params.currency,
    payment_method: "CARD",
    transaction_reference: session.id,
    status: "SUCCESS",
    notes,
  } as never);

  if (error) {
    throw error;
  }
}

export async function recordEventRegistrationPayment(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== "event_registration") {
    return;
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return;
  }

  const organizationId = session.metadata.organization_id ?? "";
  const eventId = session.metadata.event_id ?? "";
  const memberId = session.metadata.member_id ?? "";
  if (!organizationId || !eventId || !memberId) {
    throw new Error("Event registration checkout is missing metadata.");
  }

  const admin = createAdminClient();
  const existing = await admin
    .from("event_registrations")
    .select("id, status")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  let registrationId = existing.data ? String((existing.data as { id: string }).id) : null;

  if (!registrationId) {
    const byMember = await admin
      .from("event_registrations")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("member_id", memberId)
      .maybeSingle();
    registrationId = byMember.data ? String((byMember.data as { id: string }).id) : null;
  }

  const amount =
    typeof session.amount_total === "number" ? session.amount_total / 100 : null;
  const currency = session.currency ? session.currency.toUpperCase() : null;
  const paidAt = new Date().toISOString();

  if (amount == null || amount <= 0 || !currency) {
    throw new Error("Event registration checkout has no amount.");
  }

  if (registrationId) {
    const { error } = await admin
      .from("event_registrations")
      .update({
        status: "REGISTERED",
        stripe_checkout_session_id: session.id,
        amount,
        currency,
        paid_at: paidAt,
      } as never)
      .eq("id", registrationId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await admin.from("event_registrations").insert({
      event_id: eventId,
      member_id: memberId,
      status: "REGISTERED",
      stripe_checkout_session_id: session.id,
      amount,
      currency,
      paid_at: paidAt,
    } as never);

    if (error) {
      throw error;
    }
  }

  await recordEventRegistrationGiving(session, {
    organizationId,
    eventId,
    memberId,
    amount,
    currency,
  });

  await writeAuditLog({
    action: "EVENT_REGISTRATION_PAID",
    entityType: "event",
    entityId: eventId,
    metadata: {
      member_id: memberId,
      stripe_checkout_session_id: session.id,
      amount,
      currency,
    },
  });
}

export async function markEventRegistrationCheckoutFailed(sessionId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("event_registrations")
    .update({ status: "CANCELLED" } as never)
    .eq("stripe_checkout_session_id", sessionId)
    .eq("status", "PENDING_PAYMENT");

  if (error) {
    logServerError("event-payment.failed", error);
  }
}

export async function markEventRegistrationRefunded(paymentIntentId: string) {
  const stripe = getStripe();
  if (!stripe) {
    return;
  }

  let sessionId: string | null = null;
  try {
    const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
    sessionId = sessions.data[0]?.id ?? null;
  } catch (error) {
    logServerError("event-payment.refund.lookup", error);
    return;
  }

  if (!sessionId) {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("event_registrations")
    .update({ status: "CANCELLED" } as never)
    .eq("stripe_checkout_session_id", sessionId)
    .in("status", ["REGISTERED", "ATTENDED", "PENDING_PAYMENT"]);

  if (error) {
    logServerError("event-payment.refund", error);
  }

  const { error: givingError } = await admin
    .from("giving_transactions")
    .update({ status: "REFUNDED", updated_at: new Date().toISOString() } as never)
    .eq("transaction_reference", sessionId)
    .in("status", ["SUCCESS", "PENDING"]);

  if (givingError) {
    logServerError("event-payment.refund.giving", givingError);
  }
}

export async function reconcileEventRegistrationSession(sessionId: string) {
  const stripe = getStripe();
  if (!stripe) {
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.kind !== "event_registration") {
      return;
    }
    if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
      await recordEventRegistrationPayment(session);
    }
  } catch (error) {
    logServerError("event-payment.reconcile", error);
  }
}

export async function cancelEventRegistrationCheckout(sessionId: string) {
  const { member } = await currentMember();
  if (!member) {
    return;
  }

  const admin = createAdminClient();
  const existing = await admin
    .from("event_registrations")
    .select("id, status, member_id")
    .eq("stripe_checkout_session_id", sessionId)
    .eq("member_id", member.id)
    .maybeSingle();

  const row = existing.data as { id: string; status: string } | null;
  if (!row || row.status !== "PENDING_PAYMENT") {
    return;
  }

  const stripe = getStripe();
  if (stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
        await recordEventRegistrationPayment(session);
        return;
      }
    } catch (error) {
      logServerError("event-payment.cancel", error);
    }
  }

  const { error } = await admin
    .from("event_registrations")
    .update({ status: "CANCELLED" } as never)
    .eq("id", row.id)
    .eq("member_id", member.id)
    .eq("status", "PENDING_PAYMENT");

  if (error) {
    logServerError("event-payment.cancel", error);
  }
}
