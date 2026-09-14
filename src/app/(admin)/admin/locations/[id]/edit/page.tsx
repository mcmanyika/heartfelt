import { notFound } from "next/navigation";
import { LocationForm } from "@/components/forms/location-form";
import { PageHeader } from "@/components/ui/page-header";
import { getLocation } from "@/lib/services/location.service";

type EditLocationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditLocationPage({ params }: EditLocationPageProps) {
  const { id } = await params;
  const result = await getLocation(id);

  if (!result.location) {
    notFound();
  }

  const location = result.location;

  return (
    <>
      <PageHeader title={`Edit ${location.name}`} description="Changes apply to this campus only." />
      <LocationForm
        locationId={location.id}
        defaultValues={{
          name: location.name,
          code: location.code,
          country: location.country,
          city: location.city,
          address: location.address ?? "",
          phone: location.phone ?? "",
          email: location.email ?? "",
          status: location.status,
        }}
      />
    </>
  );
}
