import { randomBytes } from "crypto";
import { listPageCount, listRange, parseListPage, searchPattern } from "@/lib/admin/list-page";
import type { SortDir } from "@/lib/admin/sort";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import type { CurrentUser } from "@/lib/auth/types";
import { STAFF_ROLES } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/tenant/get-tenant";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import { displayMemberName } from "@/lib/utils/format";
import {
  TERMINAL_SOFTWARE_VERSION,
  isOtherGivingCategory,
  storedTerminalPaymentMethod,
  terminalCardChannelLabel,
  terminalMemberSearchSchema,
  terminalBatchPaymentSchema,
  terminalPaymentSchema,
  terminalSchema,
} from "@/lib/validators/terminal.schema";
import type { TerminalStatus } from "@/types";

export const TERMINAL_MUTATE_ROLES = ["SUPER_ADMIN", "LOCATION_ADMIN"] as const;

export const TERMINAL_PAGE_SIZE = 20;

export const TERMINAL_SORTS = ["code", "device", "location", "status", "last_seen"] as const;

export type TerminalSort = (typeof TERMINAL_SORTS)[number];

export type TerminalListItem = {
  id: string;
  terminal_code: string;
  device_name: string;
  serial_number: string | null;
  status: TerminalStatus;
  last_seen_at: string | null;
  software_version: string | null;
  location_id: string;
  location_name: string;
  location_code: string;
};

export type TerminalDetail = TerminalListItem & {
  organization_id: string;
};

export type PublicTerminal = {
  id: string;
  terminal_code: string;
  device_name: string;
  status: TerminalStatus;
  organization_name: string;
  location_name: string;
  location_code: string;
  categories: Array<{ id: string; name: string }>;
};

export type TerminalMemberMatch = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  membership_number: string;
};

export type TerminalGivingRow = {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  transaction_reference: string;
  created_at: string;
  category_name: string;
};

function resolveStaffLocation(current: CurrentUser, requested?: string) {
  if (!current.isSuperAdmin) {
    return current.staffLocationIds[0] ?? current.primaryLocationId ?? null;
  }

  return requested || null;
}

async function resolveListLocation(current: CurrentUser, requested?: string) {
  if (!current.isSuperAdmin) {
    return resolveStaffLocation(current);
  }

  if (requested !== undefined) {
    return requested || null;
  }

  const selection = await getAdminLocationSelection(current);
  return selection.locationId;
}

function mapTerminal(row: Record<string, unknown>): TerminalListItem {
  const location = row.locations as
    | { name: string; code: string }
    | { name: string; code: string }[]
    | null;
  const locationRow = Array.isArray(location) ? location[0] : location;

  return {
    id: String(row.id),
    terminal_code: String(row.terminal_code),
    device_name: String(row.device_name),
    serial_number: (row.serial_number as string | null) ?? null,
    status: row.status as TerminalStatus,
    last_seen_at: (row.last_seen_at as string | null) ?? null,
    software_version: (row.software_version as string | null) ?? null,
    location_id: String(row.location_id),
    location_name: locationRow?.name ?? "Unknown",
    location_code: locationRow?.code ?? "—",
  };
}

const TERMINAL_SELECT =
  "id, organization_id, location_id, terminal_code, device_name, serial_number, status, last_seen_at, software_version, locations(name, code)";

export async function listTerminals(query: {
  q?: string;
  locationId?: string;
  status?: TerminalStatus | "";
  page?: number;
  sort?: TerminalSort;
  dir?: SortDir;
} = {}) {
  const current = await requireRole(STAFF_ROLES);
  const locationId = await resolveListLocation(current, query.locationId);
  const page = parseListPage(String(query.page ?? 1));
  const { from, to } = listRange(page, TERMINAL_PAGE_SIZE);
  const sort = query.sort ?? "code";
  const ascending = (query.dir ?? "asc") === "asc";
  const options = { ascending, nullsFirst: false as const };
  const supabase = await createClient();

  let request = supabase
    .from("payment_terminals")
    .select(TERMINAL_SELECT, { count: "exact" })
    .eq("organization_id", current.organizationId);

  if (locationId) {
    request = request.eq("location_id", locationId);
  }
  if (query.status) {
    request = request.eq("status", query.status);
  }

  const pattern = searchPattern(query.q);
  if (pattern) {
    request = request.or(`terminal_code.ilike.${pattern},device_name.ilike.${pattern}`);
  }

  if (sort === "device") {
    request = request.order("device_name", options);
  } else if (sort === "location") {
    request = request.order("locations(name)" as never, options as never);
  } else if (sort === "status") {
    request = request.order("status", options);
  } else if (sort === "last_seen") {
    request = request.order("last_seen_at", options);
  } else {
    request = request.order("terminal_code", options);
  }

  const { data, error, count } = await request.range(from, to);
  if (error) {
    logServerError("terminal.list", error);
    return {
      terminals: [] as TerminalListItem[],
      locationId,
      error: "Unable to load terminals.",
      page,
      total: 0,
      pageCount: 1,
      pageSize: TERMINAL_PAGE_SIZE,
    };
  }

  const total = count ?? 0;
  return {
    terminals: ((data ?? []) as Array<Record<string, unknown>>).map(mapTerminal),
    locationId,
    page,
    total,
    pageCount: listPageCount(total, TERMINAL_PAGE_SIZE),
    pageSize: TERMINAL_PAGE_SIZE,
  };
}

export async function getTerminal(terminalId: string) {
  const current = await requireRole(STAFF_ROLES);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_terminals")
    .select(TERMINAL_SELECT)
    .eq("id", terminalId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("terminal.get", error);
    return { terminal: null as TerminalDetail | null, error: "Unable to load that terminal." };
  }

  if (!data) {
    return { terminal: null as TerminalDetail | null };
  }

  return {
    terminal: {
      ...mapTerminal(data as Record<string, unknown>),
      organization_id: current.organizationId,
    },
  };
}

async function nextTerminalCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  shortCode: string,
  locationCode: string,
) {
  const prefix = `${shortCode}-${locationCode}-T`;
  const { data } = await supabase
    .from("payment_terminals")
    .select("terminal_code")
    .eq("organization_id", organizationId)
    .ilike("terminal_code", `${prefix}%`);

  let max = 0;
  for (const row of (data ?? []) as Array<{ terminal_code: string }>) {
    const match = row.terminal_code.match(/T(\d+)$/);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function createTerminal(input: unknown) {
  const current = await requireRole(TERMINAL_MUTATE_ROLES);
  const parsed = terminalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const locationId = resolveStaffLocation(current, parsed.data.location_id);
  if (!locationId) {
    return { error: "Select a location." };
  }

  if (current.isSuperAdmin) {
    const allowed = current.accessibleLocations.some((location) => location.id === locationId);
    if (!allowed) {
      return { error: "You do not have access to that location." };
    }
  } else if (!current.staffLocationIds.includes(locationId)) {
    return { error: "You can only assign terminals to your campus." };
  }

  const supabase = await createClient();
  const { data: locationData, error: locationError } = await supabase
    .from("locations")
    .select("id, code")
    .eq("id", locationId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (locationError || !locationData) {
    return { error: "That location is not available." };
  }

  const location = locationData as { id: string; code: string };
  const terminalCode =
    parsed.data.terminal_code?.trim().toUpperCase() ||
    (await nextTerminalCode(supabase, current.organizationId, current.organizationShortCode, location.code));

  const { data, error } = await supabase
    .from("payment_terminals")
    .insert({
      organization_id: current.organizationId,
      location_id: locationId,
      terminal_code: terminalCode,
      device_name: parsed.data.device_name,
      serial_number: emptyToNull(parsed.data.serial_number),
      status: parsed.data.status,
      software_version: emptyToNull(parsed.data.software_version) ?? TERMINAL_SOFTWARE_VERSION,
    } as never)
    .select("id")
    .single();

  if (error) {
    logServerError("terminal.create", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const created = data as { id: string } | null;
  await writeAuditLog({
    action: "TERMINAL_CREATED",
    entityType: "payment_terminal",
    entityId: created?.id,
    metadata: { terminal_code: terminalCode },
  });

  return { id: created?.id };
}

export async function updateTerminal(terminalId: string, input: unknown) {
  const current = await requireRole(TERMINAL_MUTATE_ROLES);
  const parsed = terminalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getTerminal(terminalId);
  if (!existing.terminal) {
    return { error: "That terminal is not available." };
  }

  const locationId = current.isSuperAdmin
    ? parsed.data.location_id || existing.terminal.location_id
    : existing.terminal.location_id;

  if (current.isSuperAdmin) {
    const allowed = current.accessibleLocations.some((location) => location.id === locationId);
    if (!allowed) {
      return { error: "You do not have access to that location." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_terminals")
    .update({
      location_id: locationId,
      terminal_code: parsed.data.terminal_code?.trim().toUpperCase() || existing.terminal.terminal_code,
      device_name: parsed.data.device_name,
      serial_number: emptyToNull(parsed.data.serial_number),
      status: parsed.data.status,
      software_version: emptyToNull(parsed.data.software_version) ?? existing.terminal.software_version,
    } as never)
    .eq("id", terminalId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("terminal.update", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "TERMINAL_UPDATED",
    entityType: "payment_terminal",
    entityId: terminalId,
  });

  return { ok: true as const };
}

export async function setTerminalStatus(terminalId: string, status: TerminalStatus) {
  const current = await requireRole(TERMINAL_MUTATE_ROLES);
  const existing = await getTerminal(terminalId);
  if (!existing.terminal) {
    return { error: "That terminal is not available." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_terminals")
    .update({ status } as never)
    .eq("id", terminalId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("terminal.status", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "TERMINAL_STATUS_CHANGED",
    entityType: "payment_terminal",
    entityId: terminalId,
    metadata: { status },
  });

  return { ok: true as const };
}

export async function listTerminalGiving(terminalId: string) {
  await requireRole(STAFF_ROLES);
  const existing = await getTerminal(terminalId);
  if (!existing.terminal) {
    return { rows: [] as TerminalGivingRow[] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("giving_transactions")
    .select("id, amount, currency, payment_method, status, transaction_reference, created_at, giving_categories(name)")
    .eq("terminal_id", terminalId)
    .eq("organization_id", existing.terminal.organization_id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    logServerError("terminal.giving", error);
    return { rows: [] as TerminalGivingRow[] };
  }

  return {
    rows: ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
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
    }),
  };
}

export async function getPublicTerminal(terminalCode: string) {
  const tenant = await getTenant();
  if (!tenant) {
    return { terminal: null as PublicTerminal | null };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_terminals")
    .select("id, organization_id, terminal_code, device_name, status, locations(name, code)")
    .eq("organization_id", tenant.id)
    .eq("terminal_code", terminalCode.trim().toUpperCase())
    .maybeSingle();

  if (error) {
    logServerError("terminal.public", error);
    return { terminal: null as PublicTerminal | null };
  }

  if (!data) {
    return { terminal: null as PublicTerminal | null };
  }

  const row = data as Record<string, unknown>;
  const location = row.locations as
    | { name: string; code: string }
    | { name: string; code: string }[]
    | null;
  const locationRow = Array.isArray(location) ? location[0] : location;

  const { data: categories } = await supabase
    .from("giving_categories")
    .select("id, name")
    .eq("organization_id", String(row.organization_id))
    .eq("active", true)
    .order("name");

  return {
    terminal: {
      id: String(row.id),
      terminal_code: String(row.terminal_code),
      device_name: String(row.device_name),
      status: row.status as TerminalStatus,
      organization_name: tenant.name,
      location_name: locationRow?.name ?? tenant.name,
      location_code: locationRow?.code ?? "—",
      categories: (categories ?? []) as Array<{ id: string; name: string }>,
    },
  };
}

function generateTerminalReference(shortCode: string, locationCode: string) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${shortCode}-${locationCode}-T-${stamp}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

type TerminalRow = {
  id: string;
  organization_id: string;
  location_id: string;
  terminal_code: string;
  status: TerminalStatus;
  locations: { code: string } | { code: string }[] | null;
};

async function getOnlineTerminalByCode(terminalCode: string) {
  const tenant = await getTenant();
  const supabase = createAdminClient();
  if (!tenant) {
    return {
      error: "This terminal is not available.",
      terminal: null as TerminalRow | null,
      supabase,
      shortCode: "ORG",
    };
  }

  const { data, error } = await supabase
    .from("payment_terminals")
    .select("id, organization_id, location_id, terminal_code, status, locations(code)")
    .eq("organization_id", tenant.id)
    .eq("terminal_code", terminalCode.trim().toUpperCase())
    .maybeSingle();

  if (error || !data) {
    return {
      error: "This terminal is not available.",
      terminal: null as TerminalRow | null,
      supabase,
      shortCode: tenant.short_code,
    };
  }

  const terminal = data as TerminalRow;
  if (terminal.status !== "ONLINE") {
    return {
      error: "This terminal is not taking payments.",
      terminal: null as TerminalRow | null,
      supabase,
      shortCode: tenant.short_code,
    };
  }

  return { error: null as string | null, terminal, supabase, shortCode: tenant.short_code };
}

function sanitizeMemberSearch(query: string) {
  return query
    .trim()
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function memberSearchOrFilter(query: string) {
  const cleaned = sanitizeMemberSearch(query);
  if (!cleaned) {
    return null;
  }

  const like = (value: string) => `%${value}%`;
  const filters = [
    `membership_number.ilike.${like(cleaned)}`,
    `first_name.ilike.${like(cleaned)}`,
    `last_name.ilike.${like(cleaned)}`,
  ];
  const tokens = cleaned.split(" ");
  if (tokens.length >= 2) {
    const first = like(tokens[0]);
    const last = like(tokens.slice(1).join(" "));
    filters.push(`and(first_name.ilike.${first},last_name.ilike.${last})`);
    filters.push(`and(first_name.ilike.${last},last_name.ilike.${first})`);
  }

  return filters.join(",");
}

export async function searchTerminalMembers(input: unknown) {
  const parsed = terminalMemberSearchSchema.safeParse(input);
  if (!parsed.success) {
    return { members: [] as TerminalMemberMatch[], error: firstZodError(parsed.error) };
  }

  const { error, terminal, supabase } = await getOnlineTerminalByCode(parsed.data.terminal_code);
  if (error || !terminal) {
    return { members: [] as TerminalMemberMatch[], error: error ?? "This terminal is not available." };
  }

  const filter = memberSearchOrFilter(parsed.data.q);
  if (!filter) {
    return { members: [] as TerminalMemberMatch[] };
  }

  const { data, error: searchError } = await supabase
    .from("members")
    .select("id, first_name, last_name, membership_number, location_id")
    .eq("organization_id", terminal.organization_id)
    .or(filter)
    .order("last_name")
    .limit(20);

  if (searchError) {
    logServerError("terminal.members", searchError);
    return { members: [] as TerminalMemberMatch[], error: "Unable to search members." };
  }

  const rows = (data ?? []) as Array<TerminalMemberMatch & { location_id: string }>;
  rows.sort((left, right) => {
    const leftHere = left.location_id === terminal.location_id ? 0 : 1;
    const rightHere = right.location_id === terminal.location_id ? 0 : 1;
    if (leftHere !== rightHere) {
      return leftHere - rightHere;
    }
    return displayMemberName(left).localeCompare(displayMemberName(right));
  });

  return {
    members: rows.slice(0, 6).map(({ location_id: _locationId, ...member }) => member),
  };
}

export async function simulateTerminalPayment(input: unknown) {
  const parsed = terminalPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const result = await simulateTerminalBatchPayment({
    terminal_code: parsed.data.terminal_code,
    payment_method: parsed.data.payment_method,
    card_channel: parsed.data.card_channel,
    receipt_code: parsed.data.receipt_code,
    member_id: parsed.data.member_id,
    member_name: parsed.data.member_name,
    items: [
      {
        giving_category_id: parsed.data.giving_category_id,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        notes: parsed.data.notes,
      },
    ],
  });

  if (result.error) {
    return { error: result.error };
  }

  const first = result.items[0];
  return {
    id: first?.id,
    transaction_reference: first?.transaction_reference,
    member_name: result.member_name,
  };
}

export async function simulateTerminalBatchPayment(input: unknown) {
  const parsed = terminalBatchPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: firstZodError(parsed.error),
      items: [] as Array<{
        id: string;
        transaction_reference: string;
        amount: number;
        currency: string;
        giving_category_id: string;
      }>,
    };
  }

  const { error: terminalError, terminal, supabase, shortCode } = await getOnlineTerminalByCode(
    parsed.data.terminal_code,
  );
  if (terminalError || !terminal) {
    return { error: terminalError ?? "This terminal is not available.", items: [] };
  }

  const categoryIds = [...new Set(parsed.data.items.map((item) => item.giving_category_id))];
  const { data: categoryData, error: categoryError } = await supabase
    .from("giving_categories")
    .select("id, name, active")
    .eq("organization_id", terminal.organization_id)
    .in("id", categoryIds);

  if (categoryError) {
    logServerError("terminal.simulate.categories", categoryError);
    return { error: "Select an active giving category.", items: [] };
  }

  const categories = (categoryData ?? []) as Array<{ id: string; name: string; active: boolean }>;
  const activeById = new Map(categories.filter((row) => row.active).map((row) => [row.id, row]));
  if (categoryIds.some((id) => !activeById.has(id))) {
    return { error: "Select an active giving category.", items: [] };
  }

  if (
    parsed.data.items.some((item) => {
      const category = activeById.get(item.giving_category_id);
      return isOtherGivingCategory(category?.name) && !item.notes?.trim();
    })
  ) {
    return { error: "Add a note for Other.", items: [] };
  }

  const location = Array.isArray(terminal.locations) ? terminal.locations[0] : terminal.locations;
  let memberId: string | null = emptyToNull(parsed.data.member_id);
  let payerName = emptyToNull(parsed.data.member_name);

  if (memberId) {
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("id, first_name, last_name, membership_number")
      .eq("id", memberId)
      .eq("organization_id", terminal.organization_id)
      .maybeSingle();

    if (memberError || !memberData) {
      return { error: "That member could not be found.", items: [] };
    }

    const member = memberData as TerminalMemberMatch;
    memberId = member.id;
    payerName = displayMemberName(member);
  }

  const storedMethod = storedTerminalPaymentMethod(
    parsed.data.payment_method,
    parsed.data.card_channel,
  );
  const channelNote = parsed.data.card_channel
    ? `Channel: ${terminalCardChannelLabel(parsed.data.card_channel)}`
    : null;
  const receiptNote = emptyToNull(parsed.data.receipt_code)
    ? `Receipt code: ${parsed.data.receipt_code?.trim()}`
    : null;

  const rows = parsed.data.items.map((item) => {
    const extra = emptyToNull(item.notes);
    const parts = [
      payerName ? `Simulated terminal payment. Payer: ${payerName}` : "Simulated terminal payment",
      channelNote,
      receiptNote,
      extra,
    ].filter(Boolean);
    return {
      organization_id: terminal.organization_id,
      location_id: terminal.location_id,
      member_id: memberId,
      giving_category_id: item.giving_category_id,
      amount: Number(item.amount),
      currency: item.currency,
      payment_method: storedMethod,
      transaction_reference: generateTerminalReference(shortCode, location?.code ?? "LOC"),
      status: "SUCCESS" as const,
      terminal_id: terminal.id,
      notes: parts.join(". "),
      created_by: null,
    };
  });

  const { data, error } = await supabase
    .from("giving_transactions")
    .insert(rows as never)
    .select("id, transaction_reference, amount, currency, giving_category_id");

  if (error) {
    logServerError("terminal.simulate", error);
    return { error: userSafeDatabaseError(error.message), items: [] };
  }

  await supabase
    .from("payment_terminals")
    .update({ last_seen_at: new Date().toISOString() } as never)
    .eq("id", terminal.id);

  return {
    items: ((data ?? []) as Array<{
      id: string;
      transaction_reference: string;
      amount: number;
      currency: string;
      giving_category_id: string;
    }>),
    member_name: payerName,
  };
}
