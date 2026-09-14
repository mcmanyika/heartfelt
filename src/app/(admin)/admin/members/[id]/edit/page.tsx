import { notFound } from "next/navigation";
import { MemberForm } from "@/components/forms/member-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { getMember } from "@/lib/services/member.service";

type EditMemberPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMemberPage({ params }: EditMemberPageProps) {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const { id } = await params;
  const result = await getMember(id);

  if (!result.member) {
    notFound();
  }

  const member = result.member;

  return (
    <>
      <PageHeader
        title={`Edit ${member.first_name ?? "member"}`}
        description={`${member.membership_number} stays assigned even if the campus changes later.`}
      />
      <MemberForm
        memberId={member.id}
        lockLocation
        locations={[
          {
            id: member.location_id,
            name: member.location_name,
            code: member.location_code,
          },
          ...current.accessibleLocations
            .filter((location) => location.id !== member.location_id)
            .map((location) => ({
              id: location.id,
              name: location.name,
              code: location.code,
            })),
        ]}
        defaultValues={{
          first_name: member.first_name ?? "",
          last_name: member.last_name ?? "",
          email: member.email ?? "",
          phone: member.phone ?? "",
          location_id: member.location_id,
          membership_status: member.membership_status,
          date_joined: member.date_joined,
          date_of_birth: member.date_of_birth ?? "",
          gender: member.gender ?? "",
          address: member.address ?? "",
        }}
      />
    </>
  );
}
