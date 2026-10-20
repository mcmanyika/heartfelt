import { notFound } from "next/navigation";
import { ChurchLogo } from "@/components/ui/church-logo";
import { EmbedGiveForm } from "@/components/give/embed-give-form";
import {
  getPublicPaymentButton,
  reconcileEmbedGivingSession,
} from "@/lib/services/payment-button.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenant } from "@/lib/tenant/get-tenant";
import { logServerError } from "@/lib/utils/log-server-error";

type GivePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ embed?: string; paid?: string; cancelled?: string; session_id?: string }>;
};

async function markCancelled(sessionId: string) {
  if (!sessionId.startsWith("cs_")) {
    return;
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("giving_transactions")
    .update({ status: "FAILED", updated_at: new Date().toISOString() } as never)
    .eq("transaction_reference", sessionId)
    .eq("status", "PENDING");
  if (error) {
    logServerError("payment-button.cancel", error);
  }
}

export default async function GivePage({ params, searchParams }: GivePageProps) {
  await requireTenant();
  const { token } = await params;
  const query = await searchParams;

  if (query.session_id) {
    await reconcileEmbedGivingSession(query.session_id);
  }
  if (query.cancelled === "1" && query.session_id) {
    await markCancelled(query.session_id);
  }

  const { button } = await getPublicPaymentButton(decodeURIComponent(token));
  if (!button) {
    notFound();
  }

  const embedded = query.embed === "1";
  let notice: string | null = null;
  if (query.paid === "1") {
    notice = button.success_message || "Thank you. Your payment was received.";
  } else if (query.cancelled === "1") {
    notice = "Payment was cancelled. No charge was made.";
  }

  return (
    <main className={embedded ? "mx-auto w-full max-w-md p-4" : "mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10"}>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <ChurchLogo
            name={button.organization_name}
            src={button.organization_logo_url}
            className="h-10 w-10 rounded-full bg-background"
            imageClassName="h-full w-full"
          />
          <div>
            <p className="text-sm font-semibold text-navy">{button.organization_name}</p>
            <p className="text-xs text-gray-500">
              {button.location_name} ({button.location_code})
            </p>
          </div>
        </div>
        <h1 className="text-xl font-semibold text-navy">{button.name}</h1>
        <p className="mt-1 mb-5 text-sm text-gray-600">{button.category_name}</p>
        {notice ? (
          <p role="status" className="mb-4 rounded-lg border border-border bg-background px-3 py-2 text-sm text-navy">
            {notice}
          </p>
        ) : null}
        {query.paid === "1" ? null : (
          <EmbedGiveForm
            token={button.public_token}
            buttonLabel={button.button_label}
            amountMode={button.amount_mode}
            amount={button.amount}
            currency={button.currency}
            configured={button.configured}
          />
        )}
      </section>
    </main>
  );
}
