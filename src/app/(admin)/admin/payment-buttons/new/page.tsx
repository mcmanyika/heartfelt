import { PaymentButtonForm } from "@/components/forms/payment-button-form";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import { listGivingCategories } from "@/lib/services/giving.service";
import { PAYMENT_BUTTON_MUTATE_ROLES } from "@/lib/services/payment-button.service";

export default async function NewPaymentButtonPage() {
  const current = await requireRole(PAYMENT_BUTTON_MUTATE_ROLES);
  const selection = await getAdminLocationSelection(current);
  const locationId = current.isSuperAdmin
    ? (selection.locationId ?? "")
    : (current.staffLocationIds[0] ?? current.primaryLocationId ?? "");
  const categories = await listGivingCategories(true);

  return (
    <>
      <PageHeader
        title="Add payment button"
        description="Create a Stripe Checkout button for your church website."
      />
      <PaymentButtonForm
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
          location_id: locationId,
          giving_category_id: categories.categories[0]?.id ?? "",
          name: "",
          button_label: "Give",
          amount_mode: "OPEN",
          amount: "",
          currency: "USD",
          active: true,
          success_message: "Thank you for your gift.",
        }}
      />
    </>
  );
}
