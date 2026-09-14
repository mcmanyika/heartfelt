import { LocationForm } from "@/components/forms/location-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";

export default async function NewLocationPage() {
  await requireRole("SUPER_ADMIN");

  return (
    <>
      <PageHeader
        title="Add location"
        description="Create a campus. The organization is taken from your session, not the form."
      />
      <LocationForm
        defaultValues={{
          name: "",
          code: "",
          country: "",
          city: "",
          address: "",
          phone: "",
          email: "",
          status: "ACTIVE",
        }}
      />
    </>
  );
}
