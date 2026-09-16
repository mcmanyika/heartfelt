import { notFound, redirect } from "next/navigation";
import { CellGroupForm } from "@/components/forms/cell-group-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-role";
import { canMutateCellGroup, CELL_GROUP_ROLES, getCellGroup } from "@/lib/services/cell-group.service";
import { createClient } from "@/lib/supabase/server";

type EditCellGroupPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCellGroupPage({ params }: EditCellGroupPageProps) {
  const current = await requireRole(CELL_GROUP_ROLES);
  const { id } = await params;
  const result = await getCellGroup(id);

  if (!result.group) {
    notFound();
  }

  const group = result.group;
  if (!canMutateCellGroup(current, group.location_id)) {
    redirect(`/admin/cell-groups/${group.id}`);
  }

  let initialLeader = null;
  if (group.leader_member_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("members")
      .select("id, first_name, last_name, membership_number")
      .eq("id", group.leader_member_id)
      .eq("organization_id", current.organizationId)
      .maybeSingle();
    initialLeader = data as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      membership_number: string;
    } | null;
  }

  return (
    <>
      <PageHeader
        title={`Edit ${group.name}`}
        description="Organization is never taken from the form. Location Admins stay on their campus."
      />
      <CellGroupForm
        groupId={group.id}
        lockLocation={!current.isSuperAdmin}
        locations={current.accessibleLocations.map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
        }))}
        initialLeader={initialLeader}
        defaultValues={{
          location_id: group.location_id,
          name: group.name,
          code: group.code ?? "",
          description: group.description ?? "",
          venue: group.venue ?? "",
          meeting_weekday: group.meeting_weekday == null ? "" : String(group.meeting_weekday),
          meeting_time: group.meeting_time ? group.meeting_time.slice(0, 5) : "",
          leader_member_id: group.leader_member_id ?? "",
          status: group.status,
        }}
      />
    </>
  );
}
