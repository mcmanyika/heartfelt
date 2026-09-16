import { GivingCategoryForm } from "@/components/forms/giving-category-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";

export default async function NewGivingCategoryPage() {
  await requireRole("SUPER_ADMIN");

  return (
    <>
      <PageHeader title="Add giving category" description="Categories apply to every campus in this church." />
      <GivingCategoryForm
        defaultValues={{
          name: "",
          description: "",
          active: true,
        }}
      />
    </>
  );
}
