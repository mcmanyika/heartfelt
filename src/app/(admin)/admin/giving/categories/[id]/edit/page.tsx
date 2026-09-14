import { notFound } from "next/navigation";
import { GivingCategoryForm } from "@/components/forms/giving-category-form";
import { PageHeader } from "@/components/ui/page-header";
import { getGivingCategory } from "@/lib/services/giving.service";

type EditGivingCategoryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditGivingCategoryPage({ params }: EditGivingCategoryPageProps) {
  const { id } = await params;
  const result = await getGivingCategory(id);

  if (!result.category) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`Edit ${result.category.name}`} description="Changes apply to new giving immediately." />
      <GivingCategoryForm
        categoryId={result.category.id}
        defaultValues={{
          name: result.category.name,
          description: result.category.description ?? "",
          active: result.category.active,
        }}
      />
    </>
  );
}
