import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { recordPackagePayment, markPackageCheckoutFailed, markPackagePaymentRefunded } from "@/lib/services/billing-webhook.service";
import { markMemberGivingFailed, markMemberGivingRefunded, recordMemberGivingPayment } from "@/lib/services/member-giving.service";
import {
  markEmbedGivingFailed,
  markEmbedGivingRefunded,
  recordEmbedGivingPayment,
} from "@/lib/services/payment-button.service";
import { getStripe, stripeWebhookSecret } from "@/lib/billing/stripe";
import { logServerError } from "@/lib/utils/log-server-error";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = stripeWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    logServerError("billing.webhook.signature", error);
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
        if (session.metadata?.kind === "member_giving") {
          await recordMemberGivingPayment(session);
        } else if (session.metadata?.kind === "embed_giving") {
          await recordEmbedGivingPayment(session);
        } else {
          await recordPackagePayment(session);
        }
      }
    } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.kind === "member_giving") {
        await markMemberGivingFailed(session.id);
      } else if (session.metadata?.kind === "embed_giving") {
        await markEmbedGivingFailed(session.id);
      } else {
        await markPackageCheckoutFailed(session.id);
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (paymentIntentId) {
        await markPackagePaymentRefunded(paymentIntentId);
        await markMemberGivingRefunded(paymentIntentId);
        await markEmbedGivingRefunded(paymentIntentId);
      }
    }
  } catch (error) {
    logServerError("billing.webhook", error);
    return NextResponse.json({ error: "Webhook could not be recorded." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
