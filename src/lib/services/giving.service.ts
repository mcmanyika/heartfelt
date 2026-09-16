import { randomBytes } from "crypto";
import { listPageCount, listRange, parseListPage, searchPattern } from "@/lib/admin/list-page";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import type { CurrentUser } from "@/lib/auth/types";
import { STAFF_ROLES } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import {
  givingCategorySchema,
  givingTransactionSchema,
} from "@/lib/validators/giving.schema";
import { parseTerminalPaymentNotes } from "@/lib/validators/terminal.schema";
import type { MvpCurrency, PaymentMethod, TransactionStatus } from "@/types";

export const TRANSACTION_PAGE_SIZE = 20;

export type GivingCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type GivingMemberOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  membership_number: string;
  location_id: string;
};

export type GivingTransactionListItem = {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  transaction_reference: string;
  created_at: string;
  member_name: string;
  membership_number: string | null;
  location_name: string;
  location_code: string;
  category_name: string;
  card_channel: string | null;
  receipt_code: string | null;
  gift_note: string | null;
  simulated: boolean;
  terminal_code: string | null;
  terminal_name: string | null;
};

export const TRANSACTION_SORTS = [
  "reference",
  "member",
  "location",
  "category",
  "amount",
  "currency",
  "method",
  "status",
  "date",
] as const;

export type TransactionSort = (typeof TRANSACTION_SORTS)[number];

export type GivingListQuery = {
  q?: string;
  locationId?: string;
  memberId?: string;
  member?: string;
  anonymous?: "yes" | "no" | "";
  categoryId?: string;
  paymentMethod?: PaymentMethod | "";
  currency?: MvpCurrency | "";
  status?: TransactionStatus | "";
  from?: string;
  to?: string;
  page?: number;
  sort?: TransactionSort;
  dir?: "asc" | "desc";
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

export async function listGivingCategories(
  query: boolean | { activeOnly?: boolean; q?: string; active?: "yes" | "no" | ""; page?: number } = false,
) {
  const options = typeof query === "boolean" ? { activeOnly: query } : query;
  const paginate = typeof query !== "boolean" && query.page != null;
  const page = parseListPage(String(options.page ?? 1));
  const { from, to } = listRange(page);
  const current = await requireRole(STAFF_ROLES);
  const supabase = await createClient();
  let request = supabase
    .from("giving_categories")
    .select("id, name, description, active", paginate ? { count: "exact" } : undefined)
    .eq("organization_id", current.organizationId)
    .order("name");

  if (options.activeOnly || options.active === "yes") {
    request = request.eq("active", true);
  } else if (options.active === "no") {
    request = request.eq("active", false);
  }

  const pattern = searchPattern(options.q);
  if (pattern) {
    request = request.or(`name.ilike.${pattern},description.ilike.${pattern}`);
  }

  const { data, error, count } = paginate ? await request.range(from, to) : await request;
  if (error) {
    logServerError("giving.categories", error);
    return {
      categories: [] as GivingCategoryRow[],
      error: "Unable to load giving categories.",
      page,
      total: 0,
      pageCount: 1,
      pageSize: to - from + 1,
    };
  }

  const categories = (data ?? []) as GivingCategoryRow[];
  const total = paginate ? (count ?? 0) : categories.length;
  return {
    categories,
    page,
    total,
    pageCount: listPageCount(total),
    pageSize: to - from + 1,
  };
}

export async function getGivingCategory(categoryId: string) {
  const current = await requireRole("SUPER_ADMIN");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("giving_categories")
    .select("id, name, description, active")
    .eq("id", categoryId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("giving.category.get", error);
    return { category: null as GivingCategoryRow | null, error: "Unable to load that category." };
  }

  return { category: (data as GivingCategoryRow | null) ?? null };
}

export async function createGivingCategory(input: unknown) {
  const current = await requireRole("SUPER_ADMIN");
  const parsed = givingCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("giving_categories")
    .insert({
      organization_id: current.organizationId,
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
      active: parsed.data.active,
    } as never)
    .select("id")
    .single();

  if (error) {
    logServerError("giving.category.create", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const created = data as { id: string } | null;
  await writeAuditLog({
    action: "GIVING_CATEGORY_CREATED",
    entityType: "giving_category",
    entityId: created?.id,
    metadata: { name: parsed.data.name },
  });
  return { id: created?.id };
}

export async function updateGivingCategory(categoryId: string, input: unknown) {
  const current = await requireRole("SUPER_ADMIN");
  const parsed = givingCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("giving_categories")
    .update({
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
      active: parsed.data.active,
    } as never)
    .eq("id", categoryId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("giving.category.update", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "GIVING_CATEGORY_UPDATED",
    entityType: "giving_category",
    entityId: categoryId,
  });
  return { ok: true as const };
}

export async function searchMembersForGiving(query: string, locationId?: string) {
  const current = await requireRole(STAFF_ROLES);
  const scopedLocation = resolveStaffLocation(
    current,
    current.isSuperAdmin ? locationId : undefined,
  );
  const supabase = await createClient();
  let request = supabase
    .from("members")
    .select("id, first_name, last_name, membership_number, location_id")
    .eq("organization_id", current.organizationId)
    .order("last_name")
    .limit(20);

  if (scopedLocation) {
    request = request.eq("location_id", scopedLocation);
  }

  const search = query.trim();
  if (search) {
    const pattern = `%${search.replace(/,/g, "")}%`;
    request = request.or(
      `membership_number.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
    );
  }

  const { data, error } = await request;
  if (error) {
    logServerError("giving.members", error);
    return { members: [] as GivingMemberOption[] };
  }

  return { members: (data ?? []) as GivingMemberOption[] };
}

function applyTransactionSort<T extends { order: (...args: never[]) => T }>(
  request: T,
  sort: TransactionSort,
  ascending: boolean,
) {
  const options = { ascending, nullsFirst: false as const };
  if (sort === "reference") {
    return request.order("transaction_reference" as never, options as never);
  }
  if (sort === "member") {
    return request
      .order("members(last_name)" as never, options as never)
      .order("members(first_name)" as never, options as never);
  }
  if (sort === "location") {
    return request.order("locations(name)" as never, options as never);
  }
  if (sort === "category") {
    return request.order("giving_categories(name)" as never, options as never);
  }
  if (sort === "amount") {
    return request.order("amount" as never, options as never);
  }
  if (sort === "currency") {
    return request.order("currency" as never, options as never);
  }
  if (sort === "method") {
    return request.order("payment_method" as never, options as never);
  }
  if (sort === "status") {
    return request.order("status" as never, options as never);
  }
  return request.order("created_at" as never, options as never);
}

function generateReference(shortCode: string, locationCode: string) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${shortCode}-${locationCode}-${stamp}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

export async function listTransactions(query: GivingListQuery = {}) {
  const current = await requireRole(STAFF_ROLES);
  const locationId = await resolveListLocation(current, query.locationId);
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * TRANSACTION_PAGE_SIZE;
  const to = from + TRANSACTION_PAGE_SIZE - 1;
  const supabase = await createClient();

  let request = supabase
    .from("giving_transactions")
    .select(
      "id, amount, currency, payment_method, status, transaction_reference, created_at, notes, member_id, members(first_name, last_name, membership_number), locations(name, code), giving_categories(name), payment_terminals(terminal_code, device_name)",
      { count: "exact" },
    )
    .eq("organization_id", current.organizationId);

  if (locationId) {
    request = request.eq("location_id", locationId);
  }
  if (query.memberId) {
    request = request.eq("member_id", query.memberId);
  }
  if (query.member?.trim() && query.anonymous !== "yes") {
    const { members } = await searchMembersForGiving(query.member, locationId ?? undefined);
    const memberIds = members.map((member) => member.id);
    if (memberIds.length === 0) {
      return {
        transactions: [] as GivingTransactionListItem[],
        total: 0,
        page,
        pageSize: TRANSACTION_PAGE_SIZE,
        pageCount: 1,
        locationId,
      };
    }
    request = request.in("member_id", memberIds);
  }
  if (query.anonymous === "yes") {
    request = request.is("member_id", null);
  }
  if (query.anonymous === "no") {
    request = request.not("member_id", "is", null);
  }
  if (query.categoryId) {
    request = request.eq("giving_category_id", query.categoryId);
  }
  if (query.paymentMethod) {
    request = request.eq("payment_method", query.paymentMethod);
  }
  if (query.currency) {
    request = request.eq("currency", query.currency);
  }
  if (query.status) {
    request = request.eq("status", query.status);
  }
  if (query.from) {
    request = request.gte("created_at", `${query.from}T00:00:00.000Z`);
  }
  if (query.to) {
    request = request.lte("created_at", `${query.to}T23:59:59.999Z`);
  }

  const search = query.q?.trim();
  if (search) {
    request = request.ilike("transaction_reference", `%${search.replace(/,/g, "")}%`);
  }

  const sort = query.sort ?? "date";
  const ascending = (query.dir ?? "desc") === "asc";
  request = applyTransactionSort(request, sort, ascending);

  const { data, error, count } = await request.range(from, to);
  if (error) {
    logServerError("giving.list", error);
    return {
      transactions: [] as GivingTransactionListItem[],
      total: 0,
      page,
      pageSize: TRANSACTION_PAGE_SIZE,
      pageCount: 1,
      locationId,
      error: "Unable to load transactions.",
    };
  }

  const transactions = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const member = row.members as
      | { first_name: string | null; last_name: string | null; membership_number: string }
      | { first_name: string | null; last_name: string | null; membership_number: string }[]
      | null;
    const location = row.locations as
      | { name: string; code: string }
      | { name: string; code: string }[]
      | null;
    const category = row.giving_categories as { name: string } | { name: string }[] | null;
    const terminal = row.payment_terminals as
      | { terminal_code: string; device_name: string }
      | { terminal_code: string; device_name: string }[]
      | null;
    const memberRow = Array.isArray(member) ? member[0] : member;
    const locationRow = Array.isArray(location) ? location[0] : location;
    const categoryRow = Array.isArray(category) ? category[0] : category;
    const terminalRow = Array.isArray(terminal) ? terminal[0] : terminal;
    const parsedNotes = parseTerminalPaymentNotes(typeof row.notes === "string" ? row.notes : null);
    const memberName = memberRow
      ? [memberRow.first_name, memberRow.last_name].filter(Boolean).join(" ").trim() ||
        memberRow.membership_number
      : parsedNotes.payer || "Anonymous";

    return {
      id: String(row.id),
      amount: Number(row.amount),
      currency: String(row.currency),
      payment_method: String(row.payment_method),
      status: String(row.status),
      transaction_reference: String(row.transaction_reference),
      created_at: String(row.created_at),
      member_name: memberName,
      membership_number: memberRow?.membership_number ?? null,
      location_name: locationRow?.name ?? "Unknown",
      location_code: locationRow?.code ?? "—",
      category_name: categoryRow?.name ?? "Giving",
      card_channel: parsedNotes.channel,
      receipt_code: parsedNotes.receiptCode,
      gift_note: parsedNotes.note,
      simulated: parsedNotes.simulated,
      terminal_code: terminalRow?.terminal_code ?? null,
      terminal_name: terminalRow?.device_name ?? null,
    };
  });

  const total = count ?? 0;
  return {
    transactions,
    total,
    page,
    pageSize: TRANSACTION_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / TRANSACTION_PAGE_SIZE)),
    locationId,
  };
}

export async function createGivingTransaction(input: unknown) {
  const current = await requireRole(STAFF_ROLES);
  const parsed = givingTransactionSchema.safeParse(input);
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
    return { error: "You can only record giving for your assigned location." };
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
  const { data: categoryData, error: categoryError } = await supabase
    .from("giving_categories")
    .select("id, active")
    .eq("id", parsed.data.giving_category_id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (categoryError || !categoryData || !(categoryData as { active: boolean }).active) {
    return { error: "Select an active giving category." };
  }

  let memberId: string | null = null;
  if (!parsed.data.anonymous && parsed.data.member_id) {
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("id, location_id")
      .eq("id", parsed.data.member_id)
      .eq("organization_id", current.organizationId)
      .maybeSingle();

    const member = memberData as { id: string; location_id: string } | null;
    if (memberError || !member) {
      return { error: "That member is not available." };
    }
    if (member.location_id !== locationId) {
      return { error: "Choose a member who belongs to the selected campus." };
    }
    memberId = member.id;
  }

  const reference =
    parsed.data.transaction_reference?.trim() ||
    generateReference(current.organizationShortCode, location.code);

  const { data, error } = await supabase
    .from("giving_transactions")
    .insert({
      organization_id: current.organizationId,
      location_id: locationId,
      member_id: memberId,
      giving_category_id: parsed.data.giving_category_id,
      amount: Number(parsed.data.amount),
      currency: parsed.data.currency,
      payment_method: parsed.data.payment_method,
      transaction_reference: reference,
      status: "SUCCESS",
      notes: emptyToNull(parsed.data.notes),
      created_by: current.id,
    } as never)
    .select("id, transaction_reference")
    .single();

  if (error) {
    logServerError("giving.create", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const created = data as { id: string; transaction_reference: string } | null;
  await writeAuditLog({
    action: "TRANSACTION_CREATED",
    entityType: "giving_transaction",
    entityId: created?.id,
    metadata: {
      transaction_reference: created?.transaction_reference ?? reference,
      anonymous: !memberId,
    },
  });

  return { id: created?.id, transaction_reference: created?.transaction_reference ?? reference };
}

export type AmountTotal = { currency: string; amount: number };

function totalsByCurrency(rows: { amount: number; currency: string }[]): AmountTotal[] {
  return Object.values(
    rows.reduce<Record<string, AmountTotal>>((acc, row) => {
      acc[row.currency] = acc[row.currency] ?? { currency: row.currency, amount: 0 };
      acc[row.currency].amount += Number(row.amount);
      return acc;
    }, {}),
  ).sort((a, b) => a.currency.localeCompare(b.currency));
}

export async function listScopedTransactions(range: { from: string; to: string; locationId?: string | null }) {
  const current = await requireRole(STAFF_ROLES);
  const locationId = await resolveListLocation(
    current,
    range.locationId === undefined ? undefined : range.locationId ?? "",
  );
  const supabase = await createClient();
  let request = supabase
    .from("giving_transactions")
    .select(
      "id, amount, currency, payment_method, status, created_at, giving_category_id, location_id, terminal_id, giving_categories(name), locations(name, code)",
    )
    .eq("organization_id", current.organizationId)
    .gte("created_at", `${range.from}T00:00:00.000Z`)
    .lte("created_at", `${range.to}T23:59:59.999Z`);

  if (locationId) {
    request = request.eq("location_id", locationId);
  }

  const { data, error } = await request.limit(2000);
  if (error) {
    logServerError("giving.scoped", error);
    return { rows: [] as Array<Record<string, unknown>>, locationId };
  }

  return { rows: (data ?? []) as Array<Record<string, unknown>>, locationId };
}

export function summarizeGiving(rows: Array<Record<string, unknown>>) {
  const successful = rows.filter((row) => row.status === "SUCCESS");
  const totals = totalsByCurrency(
    successful.map((row) => ({ amount: Number(row.amount), currency: String(row.currency) })),
  );

  const byMonth: Record<string, Record<string, number>> = {};
  for (const row of successful) {
    const month = String(row.created_at).slice(0, 7);
    const currency = String(row.currency);
    byMonth[month] = byMonth[month] ?? {};
    byMonth[month][currency] = (byMonth[month][currency] ?? 0) + Number(row.amount);
  }

  const byCategory: Record<string, { name: string; count: number; totals: Record<string, number> }> = {};
  for (const row of successful) {
    const category = row.giving_categories as { name: string } | { name: string }[] | null;
    const name = Array.isArray(category) ? category[0]?.name ?? "Giving" : category?.name ?? "Giving";
    byCategory[name] = byCategory[name] ?? { name, count: 0, totals: {} };
    byCategory[name].count += 1;
    byCategory[name].totals[String(row.currency)] =
      (byCategory[name].totals[String(row.currency)] ?? 0) + Number(row.amount);
  }

  const byMethod: Record<string, number> = {};
  for (const row of successful) {
    const method = String(row.payment_method);
    byMethod[method] = (byMethod[method] ?? 0) + 1;
  }

  const byLocation: Record<string, { name: string; code: string; count: number; totals: Record<string, number> }> =
    {};
  for (const row of successful) {
    const location = row.locations as { name: string; code: string } | { name: string; code: string }[] | null;
    const locationRow = Array.isArray(location) ? location[0] : location;
    const key = String(row.location_id);
    byLocation[key] = byLocation[key] ?? {
      name: locationRow?.name ?? "Unknown",
      code: locationRow?.code ?? "—",
      count: 0,
      totals: {},
    };
    byLocation[key].count += 1;
    byLocation[key].totals[String(row.currency)] =
      (byLocation[key].totals[String(row.currency)] ?? 0) + Number(row.amount);
  }

  return {
    totals,
    successfulCount: successful.length,
    totalCount: rows.length,
    byMonth,
    byCategory: Object.values(byCategory).sort((a, b) => b.count - a.count),
    byMethod,
    byLocation: Object.values(byLocation).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function getGivingReport(range: { from: string; to: string; locationId?: string }) {
  const current = await requireRole(STAFF_ROLES);
  const scoped = await listScopedTransactions({
    from: range.from,
    to: range.to,
    locationId: current.isSuperAdmin ? range.locationId : undefined,
  });

  return {
    current,
    locationId: scoped.locationId,
    summary: summarizeGiving(scoped.rows),
  };
}
