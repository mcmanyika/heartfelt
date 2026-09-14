import Link from "next/link";
import { GivingTransactionForm } from "@/components/forms/giving-transaction-form";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import { listGivingCategories } from "@/lib/services/giving.service";

export default async function NewGivingTransactionPage() {
  const current = await requireRole(STAFF_ROLES);
  const [{ categories }, selection] = await Promise.all([
    listGivingCategories(true),
    getAdminLocationSelection(current),
  ]);
  const defaultLocationId = current.isSuperAdmin
    ? (selection.locationId ?? "")
    : (current.staffLocationIds[0] ?? current.primaryLocationId ?? "");

  return (
    <>
      <PageHeader
        title="Record giving"
        description="Cash, EcoCash, OneMoney, card, and bank transfer can be recorded here. Card is simulated. Live payments are not processed."
      />

      {categories.length === 0 ? (
        <p className="max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No active giving categories are available.{" "}
          {current.isSuperAdmin ? (
            <Link href="/admin/giving/categories/new" className="font-semibold underline">
              Create a category
            </Link>
          ) : (
            "Ask a Super Admin to add one."
          )}
        </p>
      ) : (
        <GivingTransactionForm
          lockLocation={!current.isSuperAdmin}
          locations={current.accessibleLocations.map((location) => ({
            id: location.id,
            name: location.name,
            code: location.code,
          }))}
          categories={categories.map((category) => ({ id: category.id, name: category.name }))}
          defaultLocationId={defaultLocationId}
        />
      )}
    </>
  );
}
