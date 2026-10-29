import { listPageCount, listRange, parseListPage } from "@/lib/admin/list-page";
import type { SortDir } from "@/lib/admin/sort";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import type { CurrentUser } from "@/lib/auth/types";
import { STAFF_ROLES } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { displayMemberName } from "@/lib/utils/format";
import { logServerError } from "@/lib/utils/log-server-error";
import {
  requisitionDecisionSchema,
  requisitionSchema,
} from "@/lib/validators/requisition.schema";
import type { FinancialRequisitionStatus } from "@/types";

export const REQUISITION_ROLES = STAFF_ROLES;
export const REQUISITION_PAGE_SIZE = 20;

export const REQUISITION_SORTS = [
  "requester",
  "department",
  "amount",
  "purpose",
  "submitted",
  "status",
] as const;

export type RequisitionSort = (typeof REQUISITION_SORTS)[number];

export type LedDepartmentOption = {
  id: string;
  name: string;
  code: string | null;
};

export type RequisitionListItem = {
  id: string;
  department_id: string;
  department_name: string;
  location_name: string;
  location_code: string;
  requested_by_member_id: string;
  requester_name: string;
  membership_number: string;
  amount: number;
  currency: string;
  purpose: string;
  notes: string | null;
  status: FinancialRequisitionStatus;
  decision_notes: string | null;
  created_at: string;
  decided_at: string | null;
};

type MemberNameRow = {
  first_name: string | null;
  last_name: string | null;
  membership_number: string;
};

function staffCampusId(current: CurrentUser) {
  return current.staffLocationIds[0] ?? current.primaryLocationId ?? null;
}

async function loadMyMember() {
  const current = await requireRole("MEMBER");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, location_id, organization_id")
    .eq("profile_id", current.id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("requisition.myMember", error);
    return {
      current,
      member: null as { id: string; location_id: string; organization_id: string } | null,
      error: "Unable to load your membership record.",
    };
  }

  return {
    current,
    member: (data as { id: string; location_id: string; organization_id: string } | null) ?? null,
    error: null as string | null,
  };
}

function mapRequisition(row: Record<string, unknown>): RequisitionListItem {
  const department = row.departments as
    | { name: string }
    | { name: string }[]
    | null;
  const departmentRow = Array.isArray(department) ? department[0] : department;
  const location = row.locations as
    | { name: string; code: string }
    | { name: string; code: string }[]
    | null;
  const locationRow = Array.isArray(location) ? location[0] : location;
  const member = row.members as MemberNameRow | MemberNameRow[] | null;
  const memberRow = Array.isArray(member) ? member[0] : member;

  return {
    id: String(row.id),
    department_id: String(row.department_id),
    department_name: departmentRow?.name ?? "Department",
    location_name: locationRow?.name ?? "—",
    location_code: locationRow?.code ?? "—",
    requested_by_member_id: String(row.requested_by_member_id),
    requester_name: memberRow ? displayMemberName(memberRow) : "Unnamed member",
    membership_number: memberRow?.membership_number ?? "—",
    amount: Number(row.amount),
    currency: String(row.currency),
    purpose: String(row.purpose),
    notes: (row.notes as string | null) ?? null,
    status: row.status as FinancialRequisitionStatus,
    decision_notes: (row.decision_notes as string | null) ?? null,
    created_at: String(row.created_at),
    decided_at: (row.decided_at as string | null) ?? null,
  };
}

const REQUISITION_SELECT =
  "id, department_id, requested_by_member_id, amount, currency, purpose, notes, status, decision_notes, created_at, decided_at, departments(name), locations(name, code), members(first_name, last_name, membership_number)";

export async function listLedDepartmentsForRequisition() {
  const { member, error } = await loadMyMember();
  if (error) {
    return { departments: [] as LedDepartmentOption[], error };
  }
  if (!member) {
    return { departments: [] as LedDepartmentOption[] };
  }

  const admin = createAdminClient();
  const { data, error: loadError } = await admin
    .from("departments")
    .select("id, name, code")
    .eq("organization_id", member.organization_id)
    .eq("leader_member_id", member.id)
    .eq("status", "ACTIVE")
    .order("name");

  if (loadError) {
    logServerError("requisition.ledDepartments", loadError);
    return { departments: [] as LedDepartmentOption[], error: "Unable to load departments." };
  }

  return { departments: (data ?? []) as LedDepartmentOption[] };
}

/** Member portal: department heads only. Staff use /admin/requisitions. */
export async function canAccessMemberRequisitions() {
  const led = await listLedDepartmentsForRequisition();
  if (led.error) {
    return { allowed: false, error: led.error };
  }
  return { allowed: led.departments.length > 0 };
}

export async function listMyRequisitions() {
  const { member, error } = await loadMyMember();
  if (error) {
    return { rows: [] as RequisitionListItem[], error };
  }
  if (!member) {
    return { rows: [] as RequisitionListItem[] };
  }

  const supabase = await createClient();
  const { data, error: loadError } = await supabase
    .from("financial_requisitions")
    .select(REQUISITION_SELECT)
    .eq("organization_id", member.organization_id)
    .eq("requested_by_member_id", member.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (loadError) {
    logServerError("requisition.mine", loadError);
    return { rows: [] as RequisitionListItem[], error: "Unable to load requisitions." };
  }

  return {
    rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapRequisition),
  };
}

export async function submitRequisition(input: unknown) {
  const parsed = requisitionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { current, member, error } = await loadMyMember();
  if (error) {
    return { error };
  }
  if (!member) {
    return { error: "Ask your campus office to link a membership record to your login." };
  }

  const admin = createAdminClient();
  const { data: department, error: departmentError } = await admin
    .from("departments")
    .select("id, location_id, status, leader_member_id, organization_id")
    .eq("id", parsed.data.department_id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (departmentError) {
    logServerError("requisition.department", departmentError);
    return { error: "Unable to submit that requisition." };
  }

  const departmentRow = department as {
    id: string;
    location_id: string;
    status: string;
    leader_member_id: string | null;
    organization_id: string;
  } | null;

  if (!departmentRow || departmentRow.status !== "ACTIVE") {
    return { error: "That department is not available." };
  }
  if (departmentRow.leader_member_id !== member.id) {
    return { error: "Only the department head can submit a requisition for this team." };
  }

  const { data, error: insertError } = await admin
    .from("financial_requisitions")
    .insert({
      organization_id: departmentRow.organization_id,
      location_id: departmentRow.location_id,
      department_id: departmentRow.id,
      requested_by_member_id: member.id,
      amount: Number(parsed.data.amount),
      currency: parsed.data.currency,
      purpose: parsed.data.purpose.trim(),
      notes: emptyToNull(parsed.data.notes),
      status: "SUBMITTED",
    } as never)
    .select("id")
    .single();

  if (insertError || !data) {
    logServerError("requisition.insert", insertError);
    return { error: userSafeDatabaseError(insertError?.message ?? "Unable to submit requisition.") };
  }

  const id = (data as { id: string }).id;
  await writeAuditLog({
    action: "FINANCIAL_REQUISITION_SUBMITTED",
    entityType: "financial_requisition",
    entityId: id,
    metadata: {
      department_id: departmentRow.id,
      amount: Number(parsed.data.amount),
      currency: parsed.data.currency,
    },
  });

  return { ok: true as const, id };
}

export async function cancelMyRequisition(requisitionId: string) {
  const { member, error } = await loadMyMember();
  if (error) {
    return { error };
  }
  if (!member) {
    return { error: "Ask your campus office to link a membership record to your login." };
  }

  const admin = createAdminClient();
  const { data, error: loadError } = await admin
    .from("financial_requisitions")
    .select("id, status, requested_by_member_id")
    .eq("id", requisitionId)
    .eq("organization_id", member.organization_id)
    .maybeSingle();

  if (loadError) {
    logServerError("requisition.cancelLoad", loadError);
    return { error: "Unable to cancel that requisition." };
  }

  const row = data as {
    id: string;
    status: FinancialRequisitionStatus;
    requested_by_member_id: string;
  } | null;

  if (!row || row.requested_by_member_id !== member.id) {
    return { error: "That requisition is not available." };
  }
  if (row.status !== "SUBMITTED") {
    return { error: "Only submitted requisitions can be cancelled." };
  }

  const { error: updateError } = await admin
    .from("financial_requisitions")
    .update({ status: "CANCELLED" } as never)
    .eq("id", row.id)
    .eq("status", "SUBMITTED");

  if (updateError) {
    logServerError("requisition.cancel", updateError);
    return { error: userSafeDatabaseError(updateError.message) };
  }

  await writeAuditLog({
    action: "FINANCIAL_REQUISITION_CANCELLED",
    entityType: "financial_requisition",
    entityId: row.id,
  });

  return { ok: true as const };
}

function applyRequisitionSort<T extends { order: (...args: never[]) => T }>(
  request: T,
  sort: RequisitionSort,
  ascending: boolean,
) {
  const options = { ascending, nullsFirst: false as const };
  if (sort === "requester") {
    return request
      .order("members(last_name)" as never, options as never)
      .order("members(first_name)" as never, options as never);
  }
  if (sort === "department") {
    return request.order("departments(name)" as never, options as never);
  }
  if (sort === "amount") {
    return request.order("amount" as never, options as never);
  }
  if (sort === "purpose") {
    return request.order("purpose" as never, options as never);
  }
  if (sort === "status") {
    return request.order("status" as never, options as never);
  }
  return request.order("created_at" as never, options as never);
}

export async function listStaffRequisitions(query: {
  page?: number;
  status?: FinancialRequisitionStatus | "all" | "";
  locationId?: string;
  sort?: RequisitionSort;
  dir?: SortDir;
} = {}) {
  const current = await requireRole(REQUISITION_ROLES);
  const page = parseListPage(String(query.page ?? 1));
  const { from, to } = listRange(page, REQUISITION_PAGE_SIZE);
  const selection = await getAdminLocationSelection(current);
  const locationId = current.isSuperAdmin
    ? query.locationId !== undefined
      ? query.locationId || null
      : selection.locationId
    : staffCampusId(current);
  const sort = query.sort ?? "submitted";
  const dir = query.dir ?? "desc";
  const ascending = dir === "asc";

  const supabase = await createClient();
  let request = supabase
    .from("financial_requisitions")
    .select(REQUISITION_SELECT, { count: "exact" })
    .eq("organization_id", current.organizationId);

  if (locationId) {
    request = request.eq("location_id", locationId);
  }
  if (query.status && query.status !== "all") {
    request = request.eq("status", query.status);
  }

  request = applyRequisitionSort(request, sort, ascending);

  const { data, error, count } = await request.range(from, to);
  if (error) {
    logServerError("requisition.staffList", error);
    return {
      rows: [] as RequisitionListItem[],
      page,
      total: 0,
      pageCount: 1,
      pageSize: REQUISITION_PAGE_SIZE,
      locationId,
      error: "Unable to load requisitions.",
    };
  }

  const total = count ?? 0;
  return {
    rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapRequisition),
    page,
    total,
    pageCount: listPageCount(total, REQUISITION_PAGE_SIZE),
    pageSize: REQUISITION_PAGE_SIZE,
    locationId,
  };
}

export async function decideRequisition(input: unknown) {
  const parsed = requisitionDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const current = await requireRole(REQUISITION_ROLES);
  const admin = createAdminClient();
  const { data, error: loadError } = await admin
    .from("financial_requisitions")
    .select("id, status, location_id, organization_id, department_id")
    .eq("id", parsed.data.requisition_id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (loadError) {
    logServerError("requisition.decideLoad", loadError);
    return { error: "Unable to update that requisition." };
  }

  const row = data as {
    id: string;
    status: FinancialRequisitionStatus;
    location_id: string;
    organization_id: string;
    department_id: string;
  } | null;

  if (!row) {
    return { error: "That requisition is not available." };
  }
  if (row.status !== "SUBMITTED") {
    return { error: "That requisition has already been decided." };
  }
  if (
    !current.isSuperAdmin &&
    !current.staffLocationIds.includes(row.location_id)
  ) {
    return { error: "You can only review requisitions for your campus." };
  }

  const { error: updateError } = await admin
    .from("financial_requisitions")
    .update({
      status: parsed.data.decision,
      decided_by: current.id,
      decided_at: new Date().toISOString(),
      decision_notes: emptyToNull(parsed.data.decision_notes),
    } as never)
    .eq("id", row.id)
    .eq("status", "SUBMITTED");

  if (updateError) {
    logServerError("requisition.decide", updateError);
    return { error: userSafeDatabaseError(updateError.message) };
  }

  await writeAuditLog({
    action:
      parsed.data.decision === "APPROVED"
        ? "FINANCIAL_REQUISITION_APPROVED"
        : "FINANCIAL_REQUISITION_REJECTED",
    entityType: "financial_requisition",
    entityId: row.id,
    metadata: {
      department_id: row.department_id,
      decision: parsed.data.decision,
    },
  });

  return { ok: true as const };
}
