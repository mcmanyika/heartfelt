import { notFound } from "next/navigation";
import { PaymentButtonForm } from "@/components/forms/payment-button-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { listGivingCategories } from "@/lib/services/giving.service";
import { getPaymentButton, PAYMENT_BUTTON_MUTATE_ROLES } from "@/lib/services/payment-button.service";

type EditPaymentButtonPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPaymentButtonPage({ params }: EditPaymentButtonPageProps) {
  const current = await requireRole(PAYMENT_BUTTON_MUTATE_ROLES);
  const { id } = await params;
  const [{ button }, categories] = await Promise.all([getPaymentButton(id), listGivingCategories(false)]);

  if (!button) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Edit payment button" description={button.name} />
      <PaymentButtonForm
        buttonId={button.id}
        lockLocation={!current.isSuperAdmin}
        locations={current.accessibleLocations.map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
        }))}
        categories={categories.categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        defaultValues={{
          location_id: button.location_id,
          giving_category_id: button.giving_category_id,
          name: button.name,
          button_label: button.button_label,
          amount_mode: button.amount_mode,
          amount: button.amount !== null ? String(button.amount) : "",
          currency: button.currency === "ZAR" ? "ZAR" : "USD",
          active: button.active,
          success_message: button.success_message ?? "",
        }}
      />
    </>
  );
}
