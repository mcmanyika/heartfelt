import "server-only";

import Stripe from "stripe";

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
}

export function isStripeConfigured() {
  return Boolean(stripeSecretKey());
}

export function getStripe() {
  const key = stripeSecretKey();
  if (!key) {
    return null;
  }

  return new Stripe(key);
}
