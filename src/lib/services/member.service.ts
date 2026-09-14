import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import type { SortDir } from "@/lib/admin/sort";
import { requireRole } from "@/lib/auth/require-role";
import type { CurrentUser } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/services/audit.service";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import { memberSchema, memberTransferSchema } from "@/lib/validators/member.schema";
import type { MembershipStatus } from "@/types";

export const MEMBER_PAGE_SIZE = 20;

export const MEMBER_SORTS = [
  "membership_number",
  "name",
  "location",
  "phone",
  "email",
  "status",
  "date_joined",
] as const;

export type MemberSort = (typeof MEMBER_SORTS)[number];

export type MemberListItem = {
  id: string;
  membership_number: string;
  membership_status: MembershipStatus;
  date_joined: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  location_id: string;
  location_name: string;
  location_code: string;
};

export type MemberRecord = {
  id: string;
  organization_id: string;
  location_id: string;
  profile_id: string | null;
  membership_number: string;
  membership_status: MembershipStatus;
  date_joined: string;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  location_name: string;
  location_code: string;
};

export type MemberGivingRow = {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  transaction_reference: string;
  created_at: string;
  category_name: string;
};

export type MemberEventRow = {
  id: string;
  title: string;
  start_date: string;
  venue: string | null;
};

type MemberRow = {
  id: string;
  organization_id?: string;
  location_id: string;
  profile_id?: string | null;
  membership_number: string;
  membership_status: MembershipStatus;
  date_joined: string;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at?: string;
  updated_at?: string;
  locations:
    | { id: string; name: string; code: string }
    | { id: string; name: string; code: string }[]
    | null;
};

function locationFromJoin(value: MemberRow["locations"]) {
  if (!value) {
    return { name: "Unknown", code: "—" };
  }

  return Array.isArray(value) ? value[0] : value;
}

function toListItem(row: MemberRow): MemberListItem {
  const location = locationFromJoin(row.locations);
  return {
    id: row.id,
    membership_number: row.membership_number,
    membership_status: row.membership_status,
    date_joined: row.date_joined,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    location_id: row.location_id,
    location_name: location?.name ?? "Unknown",
    location_code: location?.code ?? "—",
  };
}

function toRecord(row: MemberRow): MemberRecord {
  const location = locationFromJoin(row.locations);
  return {
    id: row.id,
    organization_id: row.organization_id ?? "",
    location_id: row.location_id,
    profile_id: row.profile_id ?? null,
    membership_number: row.membership_number,
    membership_status: row.membership_status,
    date_joined: row.date_joined,
    date_of_birth: row.date_of_birth ?? null,
    gender: row.gender ?? null,
    address: row.address ?? null,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
    location_name: location?.name ?? "Unknown",
    location_code: location?.code ?? "—",
  };
}

export type MemberListQuery = {
  q?: string;
  locationId?: string;
  status?: MembershipStatus | "";
  page?: number;
  sort?: MemberSort;
  dir?: SortDir;
};

function resolveScopedLocation(current: CurrentUser, requested?: string) {
  if (!current.isSuperAdmin) {
    return current.staffLocationIds[0] ?? current.primaryLocationId;
  }

  return requested || null;
}

export async function listMembers(query: MemberListQuery = {}) {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const selection = await getAdminLocationSelection(current);
  const locationId = !current.isSuperAdmin
    ? resolveScopedLocation(current)
    : query.locationId !== undefined
      ? query.locationId || null
      : selection.locationId || null;
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * MEMBER_PAGE_SIZE;
  const to = from + MEMBER_PAGE_SIZE - 1;
  const supabase = await createClient();

  let request = supabase
    .from("members")
    .select(
      "id, membership_number, membership_status, date_joined, first_name, last_name, email, phone, location_id, locations(id, name, code)",
      { count: "exact" },
    )
    .eq("organization_id", current.organizationId);

  if (locationId) {
    request = request.eq("location_id", locationId);
  }

  if (query.status) {
    request = request.eq("membership_status", query.status);
  }

  const search = query.q?.trim();
  if (search) {
    const pattern = `%${search.replace(/,/g, "")}%`;
    request = request.or(
      `membership_number.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
    );
  }

  const sort = query.sort ?? "date_joined";
  const ascending = (query.dir ?? (sort === "date_joined" ? "desc" : "asc")) === "asc";
  const options = { ascending, nullsFirst: false as const };

  if (sort === "name") {
    request = request
      .order("first_name", options)
      .order("last_name", options);
  } else if (sort === "location") {
    request = request.order("locations(name)" as never, options as never);
  } else if (sort === "status") {
    request = request.order("membership_status", options);
  } else if (sort === "membership_number" || sort === "phone" || sort === "email" || sort === "date_joined") {
    request = request.order(sort, options);
  } else {
    request = request.order("date_joined", { ascending: false, nullsFirst: false });
  }

  const { data, error, count } = await request.range(from, to);

  if (error) {
    logServerError("member.list", error);
    return {
      error: "Unable to load members.",
      members: [] as MemberListItem[],
      total: 0,
      page,
      pageSize: MEMBER_PAGE_SIZE,
      pageCount: 1,
      locationId,
    };
  }

  const total = count ?? 0;
  return {
    members: ((data ?? []) as unknown as MemberRow[]).map(toListItem),
    total,
    page,
    pageSize: MEMBER_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / MEMBER_PAGE_SIZE)),
    locationId,
    error: undefined,
  };
}

export async function getMember(memberId: string) {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select(
      "id, organization_id, location_id, profile_id, membership_number, membership_status, date_joined, date_of_birth, gender, address, first_name, last_name, email, phone, created_at, updated_at, locations(id, name, code)",
    )
    .eq("id", memberId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("member.get", error);
    return { error: "Unable to load that member." as const };
  }

  if (!data) {
    return { error: "Member not found." as const };
  }

  const member = toRecord(data as unknown as MemberRow);

  if (!current.isSuperAdmin && !current.staffLocationIds.includes(member.location_id)) {
    return { error: "You do not have access to that member." as const };
  }

  return { member };
}

function resolveCreateLocationId(current: CurrentUser, submitted?: string) {
  if (!current.isSuperAdmin) {
    return current.staffLocationIds[0] ?? current.primaryLocationId ?? null;
  }

  return submitted || null;
}

export async function createMember(input: unknown) {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const parsed = memberSchema.safeParse(input);

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const locationId = resolveCreateLocationId(current, parsed.data.location_id);

  if (!locationId) {
    return { error: "Select a location." };
  }

  if (current.isSuperAdmin) {
    const allowed = current.accessibleLocations.some((location) => location.id === locationId);
    if (!allowed) {
      return { error: "You do not have access to that location." };
    }
  } else if (!current.staffLocationIds.includes(locationId)) {
    return { error: "You can only add members to your assigned location." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .insert({
      organization_id: current.organizationId,
      location_id: locationId,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: emptyToNull(parsed.data.email),
      phone: emptyToNull(parsed.data.phone),
      membership_status: parsed.data.membership_status,
      date_joined: parsed.data.date_joined,
      date_of_birth: emptyToNull(parsed.data.date_of_birth),
      gender: emptyToNull(parsed.data.gender),
      address: emptyToNull(parsed.data.address),
    } as never)
    .select("id, membership_number")
    .single();

  if (error) {
    logServerError("member.create", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const created = data as { id: string; membership_number: string } | null;
  await writeAuditLog({
    action: "MEMBER_CREATED",
    entityType: "member",
    entityId: created?.id,
    metadata: { membership_number: created?.membership_number ?? null },
  });

  return { id: created?.id, membership_number: created?.membership_number };
}

export async function updateMember(memberId: string, input: unknown) {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const parsed = memberSchema.safeParse(input);

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getMember(memberId);
  if (!existing.member) {
    return { error: existing.error ?? "Member not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: emptyToNull(parsed.data.email),
      phone: emptyToNull(parsed.data.phone),
      membership_status: parsed.data.membership_status,
      date_joined: parsed.data.date_joined,
      date_of_birth: emptyToNull(parsed.data.date_of_birth),
      gender: emptyToNull(parsed.data.gender),
      address: emptyToNull(parsed.data.address),
    } as never)
    .eq("id", memberId)
    .eq("organization_id", current.organizationId)
    .eq("location_id", existing.member.location_id);

  if (error) {
    logServerError("member.update", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "MEMBER_UPDATED",
    entityType: "member",
    entityId: memberId,
  });

  return { ok: true as const };
}

export async function deactivateMember(memberId: string) {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const existing = await getMember(memberId);
  if (!existing.member) {
    return { error: existing.error ?? "Member not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ membership_status: "INACTIVE_MEMBER" } as never)
    .eq("id", memberId)
    .eq("organization_id", current.organizationId)
    .eq("location_id", existing.member.location_id);

  if (error) {
    logServerError("member.deactivate", error);
    return { error: "Unable to deactivate that member." };
  }

  await writeAuditLog({
    action: "MEMBER_UPDATED",
    entityType: "member",
    entityId: memberId,
    metadata: { membership_status: "INACTIVE_MEMBER" },
  });

  return { ok: true as const };
}

export async function listStaffLocations() {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_org_locations_for_staff" as never);

  if (!error && Array.isArray(data)) {
    return {
      locations: (data as { id: string; name: string; code: string; status: string }[]).filter(
        (location) => location.status === "ACTIVE",
      ),
    };
  }

  return {
    locations: current.accessibleLocations.filter((location) => location.status === "ACTIVE"),
  };
}

export async function listTransferDestinations(fromLocationId: string) {
  const result = await listStaffLocations();
  return {
    locations: result.locations.filter((location) => location.id !== fromLocationId),
  };
}

export async function transferMember(input: unknown) {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const parsed = memberTransferSchema.safeParse(input);

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getMember(parsed.data.member_id);
  if (!existing.member) {
    return { error: existing.error ?? "Member not found." };
  }

  if (existing.member.location_id === parsed.data.to_location_id) {
    return { error: "Choose a different location." };
  }

  const supabase = await createClient();
  const { error: rpcError } = await supabase.rpc("transfer_member" as never, {
    p_member_id: parsed.data.member_id,
    p_to_location_id: parsed.data.to_location_id,
  } as never);

  if (!rpcError) {
    return { ok: true as const };
  }

  if (!current.isSuperAdmin) {
    logServerError("member.transfer", rpcError);
    return { error: "Ask a Super Admin to transfer this member to another campus." };
  }

  const destination = current.accessibleLocations.find(
    (location) => location.id === parsed.data.to_location_id,
  );

  if (!destination) {
    return { error: "You do not have access to that location." };
  }

  const { error } = await supabase
    .from("members")
    .update({ location_id: parsed.data.to_location_id } as never)
    .eq("id", parsed.data.member_id)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("member.transfer.update", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "MEMBER_TRANSFERRED",
    entityType: "member",
    entityId: parsed.data.member_id,
    metadata: {
      from_location_id: existing.member.location_id,
      to_location_id: parsed.data.to_location_id,
    },
  });

  return { ok: true as const };
}

export async function getMemberGiving(memberId: string) {
  const existing = await getMember(memberId);
  if (!existing.member) {
    return { error: existing.error, rows: [] as MemberGivingRow[], totals: [] as { currency: string; amount: number }[] };
  }

  const supabase = await createClient();
  const yearStart = `${new Date().getUTCFullYear()}-01-01T00:00:00.000Z`;
  const { data, error } = await supabase
    .from("giving_transactions")
    .select(
      "id, amount, currency, payment_method, status, transaction_reference, created_at, giving_categories(name)",
    )
    .eq("member_id", memberId)
    .eq("organization_id", existing.member.organization_id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    logServerError("member.giving", error);
    return { rows: [] as MemberGivingRow[], totals: [] as { currency: string; amount: number }[] };
  }

  const rows: MemberGivingRow[] = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const category = row.giving_categories as { name: string } | { name: string }[] | null;
    return {
      id: String(row.id),
      amount: Number(row.amount),
      currency: String(row.currency),
      payment_method: String(row.payment_method),
      status: String(row.status),
      transaction_reference: String(row.transaction_reference),
      created_at: String(row.created_at),
      category_name: Array.isArray(category) ? category[0]?.name ?? "Giving" : category?.name ?? "Giving",
    };
  });

  const { data: yearData } = await supabase
    .from("giving_transactions")
    .select("amount, currency, status, created_at")
    .eq("member_id", memberId)
    .eq("organization_id", existing.member.organization_id)
    .eq("status", "SUCCESS")
    .gte("created_at", yearStart);

  const totals = Object.values(
    ((yearData ?? []) as { amount: number; currency: string }[]).reduce<
      Record<string, { currency: string; amount: number }>
    >((acc, row) => {
      acc[row.currency] = acc[row.currency] ?? { currency: row.currency, amount: 0 };
      acc[row.currency].amount += Number(row.amount);
      return acc;
    }, {}),
  );

  return { rows, totals };
}

export async function getMemberUpcomingEvents(member: MemberRecord) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_date, venue, location_id")
    .eq("organization_id", member.organization_id)
    .gte("start_date", new Date().toISOString())
    .or(`location_id.is.null,location_id.eq.${member.location_id}`)
    .order("start_date", { ascending: true })
    .limit(5);

  if (error) {
    logServerError("member.events", error);
    return [] as MemberEventRow[];
  }

  return ((data ?? []) as MemberEventRow[]).map((event) => ({
    id: event.id,
    title: event.title,
    start_date: event.start_date,
    venue: event.venue,
  }));
}
