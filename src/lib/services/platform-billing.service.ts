import "server-only";

import { redirect } from "next/navigation";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { requireUser } from "@/lib/auth/require-user";
import { isPackagePlan } from "@/lib/services/billing-webhook.service";
import { packagePlanLabel, type PackagePlan } from "@/lib/billing/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/utils/log-server-error";

export type DenominationSubscription = {
  id: string;
  name: string;
  slug: string;
  shortCode: string;
  plan: PackagePlan | null;
  planLabel: string;
  status: "UNPAID" | "ACTIVE" | "PAST_DUE";
  locationCount: number;
  periodEnd: string | null;
  amountCents: number | null;
  currency: string | null;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | null;
  paidAt: string | null;
};

async function requirePlatformAdmin() {
  const current = await requireUser();
  if (!isPlatformAdminEmail(current.email)) {
    redirect("/admin/dashboard");
  }
  return current;
}

export async function listDenominationSubscriptions() {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const [organizations, billing, payments] = await Promise.all([
    admin.from("organizations").select("id, name, slug, short_code").order("name"),
    admin
      .from("organization_billing")
      .select("organization_id, plan, status, location_count, current_period_end"),
    admin
      .from("package_payments")
      .select("organization_id, plan, amount_cents, currency, status, paid_at, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (organizations.error) {
    logServerError("platform.subscriptions.organizations", organizations.error);
    return { rows: [] as DenominationSubscription[], error: "Subscriptions could not be loaded." };
  }
  if (billing.error) {
    logServerError("platform.subscriptions.billing", billing.error);
  }
  if (payments.error) {
    logServerError("platform.subscriptions.payments", payments.error);
  }

  const billingByOrg = new Map(
    ((billing.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.organization_id), row]),
  );
  const latestPaymentByOrg = new Map<string, Record<string, unknown>>();
  for (const row of (payments.data ?? []) as Array<Record<string, unknown>>) {
    const organizationId = String(row.organization_id);
    if (!latestPaymentByOrg.has(organizationId)) {
      latestPaymentByOrg.set(organizationId, row);
    }
  }

  const rows = ((organizations.data ?? []) as Array<Record<string, unknown>>).map((organization) => {
    const organizationId = String(organization.id);
    const account = billingByOrg.get(organizationId);
    const payment = latestPaymentByOrg.get(organizationId);
    const planValue = account?.plan ? String(account.plan) : payment?.plan ? String(payment.plan) : null;
    const plan = isPackagePlan(planValue) ? planValue : null;
    const statusValue = account?.status ? String(account.status) : "UNPAID";
    const status = statusValue === "ACTIVE" || statusValue === "PAST_DUE" ? statusValue : "UNPAID";
    const paymentStatusValue = payment?.status ? String(payment.status) : null;
    const paymentStatus =
      paymentStatusValue === "PENDING" ||
      paymentStatusValue === "PAID" ||
      paymentStatusValue === "FAILED" ||
      paymentStatusValue === "REFUNDED"
        ? paymentStatusValue
        : null;

    return {
      id: organizationId,
      name: String(organization.name),
      slug: String(organization.slug),
      shortCode: String(organization.short_code),
      plan,
      planLabel: plan ? packagePlanLabel(plan) : "None",
      status,
      locationCount: Number(account?.location_count ?? 0),
      periodEnd: account?.current_period_end ? String(account.current_period_end) : null,
      amountCents: payment ? Number(payment.amount_cents) : null,
      currency: payment ? String(payment.currency) : null,
      paymentStatus,
      paidAt: payment?.paid_at ? String(payment.paid_at) : payment?.created_at ? String(payment.created_at) : null,
    } satisfies DenominationSubscription;
  });

  return { rows, error: null as string | null };
}
