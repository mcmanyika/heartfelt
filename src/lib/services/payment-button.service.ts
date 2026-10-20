import "server-only";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { listPageCount, listRange, parseListPage, searchPattern } from "@/lib/admin/list-page";
import type { SortDir } from "@/lib/admin/sort";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import type { CurrentUser } from "@/lib/auth/types";
import { STAFF_ROLES } from "@/lib/auth/types";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenant/get-tenant";
import { requestTenantOrigin } from "@/lib/tenant/request-origin";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import {
  embedGivingCheckoutSchema,
  paymentButtonSchema,
} from "@/lib/validators/payment-button.schema";

export const PAYMENT_BUTTON_MUTATE_ROLES = ["SUPER_ADMIN", "LOCATION_ADMIN"] as const;
export const PAYMENT_BUTTON_PAGE_SIZE = 20;
export const PAYMENT_BUTTON_SORTS = ["name", "location", "category", "status", "created"] as const;
export type PaymentButtonSort = (typeof PAYMENT_BUTTON_SORTS)[number];

export type PaymentButtonListItem = {
  id: string;
  name: string;
  button_label: string;
  public_token: string;
  amount_mode: "FIXED" | "OPEN";
  amount: number | null;
  currency: string;
  active: boolean;
  location_id: string;
  location_name: string;
  location_code: string;
  category_name: string;
  created_at: string;
};

export type PaymentButtonDetail = PaymentButtonListItem & {
  organization_id: string;
  giving_category_id: string;
  success_message: string | null;
  public_url: string;
  iframe_snippet: string;
  link_snippet: string;
};

export type PublicPaymentButton = {
  id: string;
  public_token: string;
  name: string;
  button_label: string;
  amount_mode: "FIXED" | "OPEN";
  amount: number | null;
  currency: string;
  success_message: string | null;
  category_name: string;
  organization_name: string;
  organization_logo_url: string | null;
  location_name: string;
  location_code: string;
  configured: boolean;
};

function resolveStaffLocation(current: CurrentUser, requested?: string) {
  if (!current.isSuperAdmin) {
    return current.staffLocationIds[0] ?? current.primaryLocationId ?? null;
  }
  return requested || null;
}

async function resolveListLocation(current: CurrentUser, requested?: string) {
  if (!current.isSuperAdmin) {
    return resolveStaffLocation(current);
  }
  if (requested !== undefined) {
    return requested || null;
  }
  const selection = await getAdminLocationSelection(current);
  return selection.locationId;
}

function nextPublicToken() {
  return randomBytes(18).toString("base64url");
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }
  return session.payment_intent?.id ?? null;
}

function stripeNote(paymentIntent: string | null) {
  return paymentIntent ? `Stripe embed ${paymentIntent}` : "Stripe embed";
}

async function requestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function embedSnippets(token: string) {
  const tenant = await requireTenant();
  const origin = await requestTenantOrigin(tenant.slug);
  const publicUrl = `${origin}/give/${token}`;
  return {
    public_url: publicUrl,
    link_snippet: `<a href="${publicUrl}" target="_blank" rel="noopener noreferrer">Give</a>`,
    iframe_snippet: `<iframe src="${publicUrl}?embed=1" title="Give" style="border:0;width:100%;max-width:420px;height:420px;" loading="lazy"></iframe>`,
  };
}

function mapListRow(row: Record<string, unknown>): PaymentButtonListItem {
  const location = row.locations as { name: string; code: string } | { name: string; code: string }[] | null;
  const locationRow = Array.isArray(location) ? location[0] : location;
  const category = row.giving_categories as { name: string } | { name: string }[] | null;
  const categoryRow = Array.isArray(category) ? category[0] : category;
  return {
    id: String(row.id),
    name: String(row.name),
    button_label: String(row.button_label),
    public_token: String(row.public_token),
    amount_mode: row.amount_mode === "FIXED" ? "FIXED" : "OPEN",
    amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
    currency: String(row.currency),
    active: Boolean(row.active),
    location_id: String(row.location_id),
    location_name: locationRow?.name ?? "—",
    location_code: locationRow?.code ?? "—",
    category_name: categoryRow?.name ?? "Giving",
    created_at: String(row.created_at),
  };
}

export async function listPaymentButtons(query: {
  q?: string;
  locationId?: string;
  active?: "yes" | "no" | "";
  page?: number;
  sort?: PaymentButtonSort;
  dir?: SortDir;
}) {
  const current = await requireRole(STAFF_ROLES);
  const safePage = parseListPage(String(query.page ?? 1));
  const { from, to } = listRange(safePage, PAYMENT_BUTTON_PAGE_SIZE);
  const locationId = await resolveListLocation(current, query.locationId);
  const sort = query.sort ?? "name";
  const dir = query.dir ?? "asc";
  const ascending = dir === "asc";

  const supabase = await createClient();
  let request = supabase
    .from("payment_buttons")
    .select(
      "id, name, button_label, public_token, amount_mode, amount, currency, active, location_id, created_at, locations(name, code), giving_categories(name)",
      { count: "exact" },
    )
    .eq("organization_id", current.organizationId);

  if (locationId) {
    request = request.eq("location_id", locationId);
  }
  if (query.active === "yes") {
    request = request.eq("active", true);
  } else if (query.active === "no") {
    request = request.eq("active", false);
  }

  const pattern = searchPattern(query.q);
  if (pattern) {
    request = request.or(`name.ilike.${pattern},button_label.ilike.${pattern}`);
  }

  switch (sort) {
    case "location":
      request = request.order("locations(name)" as never, { ascending } as never);
      break;
    case "category":
      request = request.order("giving_categories(name)" as never, { ascending } as never);
      break;
    case "status":
      request = request.order("active", { ascending });
      break;
    case "created":
      request = request.order("created_at", { ascending });
      break;
    default:
      request = request.order("name", { ascending });
  }

  const { data, error, count } = await request.range(from, to);
  if (error) {
    logServerError("payment-button.list", error);
    const missing =
      (error as { code?: string }).code === "PGRST205" ||
      (error as { code?: string }).code === "42P01" ||
      /payment_buttons/i.test(error.message ?? "");
    return {
      buttons: [] as PaymentButtonListItem[],
      total: 0,
      page: safePage,
      pageSize: PAYMENT_BUTTON_PAGE_SIZE,
      pageCount: 1,
      locationId,
      error: missing
        ? "Payment buttons migration is not applied yet. Run supabase/migrations/013_payment_buttons.sql."
        : "Unable to load payment buttons.",
    };
  }

  const total = count ?? 0;
  return {
    buttons: ((data ?? []) as Array<Record<string, unknown>>).map(mapListRow),
    total,
    page: safePage,
    pageSize: PAYMENT_BUTTON_PAGE_SIZE,
    pageCount: listPageCount(total, PAYMENT_BUTTON_PAGE_SIZE),
    locationId,
  };
}

export async function getPaymentButton(buttonId: string) {
  const current = await requireRole(STAFF_ROLES);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_buttons")
    .select(
      "id, organization_id, location_id, giving_category_id, name, button_label, public_token, amount_mode, amount, currency, active, success_message, created_at, locations(name, code), giving_categories(name)",
    )
    .eq("id", buttonId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("payment-button.get", error);
    return { button: null as PaymentButtonDetail | null };
  }
  if (!data) {
    return { button: null as PaymentButtonDetail | null };
  }

  const mapped = mapListRow(data as Record<string, unknown>);
  const snippets = await embedSnippets(mapped.public_token);
  return {
    button: {
      ...mapped,
      organization_id: String((data as { organization_id: string }).organization_id),
      giving_category_id: String((data as { giving_category_id: string }).giving_category_id),
      success_message: (data as { success_message: string | null }).success_message,
      ...snippets,
    } satisfies PaymentButtonDetail,
  };
}

export async function listPaymentButtonGiving(buttonId: string) {
  const current = await requireRole(STAFF_ROLES);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("giving_transactions")
    .select("id, amount, currency, payment_method, status, transaction_reference, created_at, giving_categories(name)")
    .eq("organization_id", current.organizationId)
    .eq("payment_button_id", buttonId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    logServerError("payment-button.giving", error);
    return { rows: [] as Array<Record<string, string | number>> };
  }

  return {
    rows: ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const category = row.giving_categories as { name: string } | { name: string }[] | null;
      return {
        id: String(row.id),
        amount: Number(row.amount),
        currency: String(row.currency),
        payment_method: String(row.payment_method),
        status: String(row.status),
        transaction_reference: String(row.transaction_reference),
        created_at: String(row.created_at),
        category_name: Array.isArray(category) ? category[0]?.name ?? "Giving" : category?.name ?? "Giving",
      };
    }),
  };
}

export async function createPaymentButton(input: unknown) {
  const current = await requireRole(PAYMENT_BUTTON_MUTATE_ROLES);
  const parsed = paymentButtonSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const locationId = resolveStaffLocation(current, parsed.data.location_id);
  if (!locationId) {
    return { error: "Select a location." };
  }
  if (current.isSuperAdmin) {
    if (!current.accessibleLocations.some((location) => location.id === locationId)) {
      return { error: "You do not have access to that location." };
    }
  } else if (!current.staffLocationIds.includes(locationId)) {
    return { error: "You can only create buttons for your campus." };
  }

  const supabase = await createClient();
  const categoryResult = await supabase
    .from("giving_categories")
    .select("id, active")
    .eq("id", parsed.data.giving_category_id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();
  const category = categoryResult.data as { id: string; active: boolean } | null;
  if (categoryResult.error || !category?.active) {
    return { error: "Select an active giving category." };
  }

  const token = nextPublicToken();
  const { data, error } = await supabase
    .from("payment_buttons")
    .insert({
      organization_id: current.organizationId,
      location_id: locationId,
      giving_category_id: category.id,
      public_token: token,
      name: parsed.data.name,
      button_label: parsed.data.button_label,
      amount_mode: parsed.data.amount_mode,
      amount: parsed.data.amount_mode === "FIXED" ? Number(parsed.data.amount) : null,
      currency: parsed.data.currency,
      active: parsed.data.active,
      success_message: emptyToNull(parsed.data.success_message),
      created_by: current.id,
    } as never)
    .select("id")
    .single();

  if (error) {
    logServerError("payment-button.create", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const created = data as { id: string } | null;
  await writeAuditLog({
    action: "PAYMENT_BUTTON_CREATED",
    entityType: "payment_button",
    entityId: created?.id,
    metadata: { name: parsed.data.name, public_token: token },
  });

  return { id: created?.id };
}

export async function updatePaymentButton(buttonId: string, input: unknown) {
  const current = await requireRole(PAYMENT_BUTTON_MUTATE_ROLES);
  const parsed = paymentButtonSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getPaymentButton(buttonId);
  if (!existing.button) {
    return { error: "That payment button is not available." };
  }

  const locationId = current.isSuperAdmin
    ? parsed.data.location_id || existing.button.location_id
    : existing.button.location_id;

  if (current.isSuperAdmin && !current.accessibleLocations.some((location) => location.id === locationId)) {
    return { error: "You do not have access to that location." };
  }

  const supabase = await createClient();
  const categoryResult = await supabase
    .from("giving_categories")
    .select("id, active")
    .eq("id", parsed.data.giving_category_id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();
  const category = categoryResult.data as { id: string; active: boolean } | null;
  if (categoryResult.error || !category) {
    return { error: "Select a giving category." };
  }

  const { error } = await supabase
    .from("payment_buttons")
    .update({
      location_id: locationId,
      giving_category_id: category.id,
      name: parsed.data.name,
      button_label: parsed.data.button_label,
      amount_mode: parsed.data.amount_mode,
      amount: parsed.data.amount_mode === "FIXED" ? Number(parsed.data.amount) : null,
      currency: parsed.data.currency,
      active: parsed.data.active,
      success_message: emptyToNull(parsed.data.success_message),
    } as never)
    .eq("id", buttonId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("payment-button.update", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "PAYMENT_BUTTON_UPDATED",
    entityType: "payment_button",
    entityId: buttonId,
    metadata: { name: parsed.data.name, active: parsed.data.active },
  });

  return { ok: true as const };
}

export async function setPaymentButtonActive(buttonId: string, active: boolean) {
  const current = await requireRole(PAYMENT_BUTTON_MUTATE_ROLES);
  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_buttons")
    .update({ active } as never)
    .eq("id", buttonId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("payment-button.active", error);
    return { error: "Unable to update that button." };
  }

  await writeAuditLog({
    action: active ? "PAYMENT_BUTTON_ACTIVATED" : "PAYMENT_BUTTON_DEACTIVATED",
    entityType: "payment_button",
    entityId: buttonId,
  });

  return { ok: true as const };
}

export async function getPublicPaymentButton(token: string) {
  const tenant = await requireTenant();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_buttons")
    .select(
      "id, public_token, name, button_label, amount_mode, amount, currency, active, success_message, organization_id, locations(name, code), giving_categories(name), organizations(name, logo_url)",
    )
    .eq("public_token", token)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    logServerError("payment-button.public", error);
    return { button: null as PublicPaymentButton | null };
  }
  if (!data) {
    return { button: null as PublicPaymentButton | null };
  }

  const row = data as Record<string, unknown>;
  if (String(row.organization_id) !== tenant.id) {
    return { button: null as PublicPaymentButton | null };
  }

  const location = row.locations as { name: string; code: string } | { name: string; code: string }[] | null;
  const locationRow = Array.isArray(location) ? location[0] : location;
  const category = row.giving_categories as { name: string } | { name: string }[] | null;
  const categoryRow = Array.isArray(category) ? category[0] : category;
  const organization = row.organizations as
    | { name: string; logo_url: string | null }
    | { name: string; logo_url: string | null }[]
    | null;
  const organizationRow = Array.isArray(organization) ? organization[0] : organization;

  return {
    button: {
      id: String(row.id),
      public_token: String(row.public_token),
      name: String(row.name),
      button_label: String(row.button_label),
      amount_mode: row.amount_mode === "FIXED" ? "FIXED" : "OPEN",
      amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
      currency: String(row.currency),
      success_message: row.success_message ? String(row.success_message) : null,
      category_name: categoryRow?.name ?? "Giving",
      organization_name: organizationRow?.name ?? tenant.name,
      organization_logo_url: organizationRow?.logo_url ?? tenant.logo_url,
      location_name: locationRow?.name ?? "—",
      location_code: locationRow?.code ?? "—",
      configured: isStripeConfigured(),
    } satisfies PublicPaymentButton,
  };
}

export async function recordEmbedGivingPayment(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== "embed_giving") {
    return;
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return;
  }

  const organizationId = session.metadata.organization_id ?? "";
  const locationId = session.metadata.location_id ?? "";
  const categoryId = session.metadata.giving_category_id ?? "";
  const buttonId = session.metadata.payment_button_id ?? "";
  if (!organizationId || !locationId || !categoryId || !buttonId) {
    throw new Error("Embed checkout is missing the church or button.");
  }

  const admin = createAdminClient();
  const existing = await admin
    .from("giving_transactions")
    .select("id, status, organization_id, amount, currency")
    .eq("transaction_reference", session.id)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  const row = existing.data as {
    id: string;
    status: string;
    organization_id: string;
    amount: number;
    currency: string;
  } | null;

  if (row && row.organization_id !== organizationId) {
    throw new Error("Embed checkout does not match the stored church.");
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
    const { error } = await admin
      .from("giving_transactions")
      .update({ status: "SUCCESS", notes: stripeNote(intentId), updated_at: paidAt } as never)
      .eq("id", row.id);
    if (error) {
      throw error;
    }
  } else {
    const amountCents = session.amount_total ?? 0;
    if (amountCents <= 0 || !session.currency) {
      throw new Error("Embed checkout has no amount.");
    }
    const { error } = await admin.from("giving_transactions").insert({
      organization_id: organizationId,
      location_id: locationId,
      giving_category_id: categoryId,
      payment_button_id: buttonId,
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
    action: "EMBED_GIVING_RECORDED",
    entity_type: "giving_transaction",
    metadata: {
      payment_button_id: buttonId,
      stripe_checkout_session_id: session.id,
      source: "stripe",
    },
  } as never);
  if (auditError) {
    logServerError("payment-button.audit", auditError);
  }
}

export async function markEmbedGivingFailed(sessionId: string) {
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

export async function markEmbedGivingRefunded(paymentIntentIdValue: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("giving_transactions")
    .update({ status: "REFUNDED", updated_at: new Date().toISOString() } as never)
    .eq("notes", stripeNote(paymentIntentIdValue))
    .eq("status", "SUCCESS");
  if (error) {
    throw error;
  }
}

export async function reconcileEmbedGivingSession(sessionId: string) {
  if (!sessionId.startsWith("cs_")) {
    return;
  }
  const stripe = getStripe();
  if (!stripe) {
    return;
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.kind !== "embed_giving") {
      return;
    }
    if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
      await recordEmbedGivingPayment(session);
    } else if (session.status === "expired") {
      await markEmbedGivingFailed(session.id);
    }
  } catch (error) {
    logServerError("payment-button.reconcile", error);
  }
}

export async function createEmbedGivingCheckout(input: unknown) {
  const parsed = embedGivingCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the gift and try again." };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { error: "Online giving is not available yet." };
  }

  const tenant = await requireTenant();
  const admin = createAdminClient();
  const buttonResult = await admin
    .from("payment_buttons")
    .select(
      "id, organization_id, location_id, giving_category_id, name, amount_mode, amount, currency, active, public_token, giving_categories(name)",
    )
    .eq("public_token", parsed.data.token)
    .eq("active", true)
    .maybeSingle();

  if (buttonResult.error) {
    logServerError("payment-button.checkout", buttonResult.error);
    return { error: "That payment button is not available." };
  }

  const button = buttonResult.data as Record<string, unknown> | null;
  if (!button || String(button.organization_id) !== tenant.id) {
    return { error: "That payment button is not available." };
  }

  const amountMode = button.amount_mode === "FIXED" ? "FIXED" : "OPEN";
  let amount = amountMode === "FIXED" ? Number(button.amount) : Number(parsed.data.amount);
  if (!(amount > 0)) {
    return { error: "Enter an amount." };
  }
  const currency = String(button.currency).toUpperCase();
  const minimum = currency === "ZAR" ? 5 : 0.5;
  if (amount < minimum) {
    return { error: `Enter at least ${minimum.toFixed(2)} ${currency}.` };
  }
  if (amountMode === "FIXED" && Number(button.amount) !== amount) {
    amount = Number(button.amount);
  }

  const category = button.giving_categories as { name: string } | { name: string }[] | null;
  const categoryName = Array.isArray(category) ? category[0]?.name ?? String(button.name) : category?.name ?? String(button.name);
  const amountCents = Math.round(amount * 100);
  const origin = await requestOrigin();
  const token = String(button.public_token);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: String(button.id),
      success_url: `${origin}/give/${token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/give/${token}?cancelled=1&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        kind: "embed_giving",
        organization_id: String(button.organization_id),
        location_id: String(button.location_id),
        giving_category_id: String(button.giving_category_id),
        payment_button_id: String(button.id),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: amountCents,
            product_data: { name: categoryName },
          },
        },
      ],
    });
  } catch (error) {
    logServerError("payment-button.checkout", error);
    return { error: "Stripe could not start this payment." };
  }

  if (!session.url) {
    return { error: "Stripe did not return a checkout page." };
  }

  const { error: insertError } = await admin.from("giving_transactions").insert({
    organization_id: String(button.organization_id),
    location_id: String(button.location_id),
    giving_category_id: String(button.giving_category_id),
    payment_button_id: String(button.id),
    amount,
    currency,
    payment_method: "CARD",
    transaction_reference: session.id,
    status: "PENDING",
    notes: "Stripe embed",
  } as never);

  if (insertError) {
    logServerError("payment-button.pending", insertError);
    return { error: "The gift could not be saved. No payment was taken." };
  }

  return { url: session.url };
}
