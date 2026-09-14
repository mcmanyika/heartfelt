import { requireRole } from "@/lib/auth/require-role";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import { profileSchema } from "@/lib/validators/profile.schema";
import type { MembershipStatus } from "@/types";

import { LIST_PAGE_SIZE, listPageCount, listRange, parseListPage, searchPattern } from "@/lib/admin/list-page";

export const PORTAL_GIVING_PAGE_SIZE = LIST_PAGE_SIZE;

export type PortalLocation = {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
};

export type PortalMember = {
  id: string;
  location_id: string;
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
};

export type PortalGivingRow = {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  transaction_reference: string;
  created_at: string;
  category_name: string;
};

export type PortalEvent = {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  start_date: string;
  end_date: string | null;
  registration_required: boolean;
  capacity: number | null;
  location_name: string | null;
  registered: boolean;
};

export type PortalAnnouncement = {
  id: string;
  title: string;
  message: string;
  publish_date: string;
  location_name: string | null;
};

type LocationJoin = { id: string; name: string; code: string; city: string; country: string } | null;

function asLocation(value: LocationJoin | LocationJoin[] | null): LocationJoin {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getPortalContext() {
  const current = await requireRole("MEMBER");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select(
      "id, location_id, membership_number, membership_status, date_joined, date_of_birth, gender, address, first_name, last_name, email, phone, locations(id, name, code, city, country)",
    )
    .eq("profile_id", current.id)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("portal.member", error);
  }

  const row = data as
    | (PortalMember & { locations: LocationJoin | LocationJoin[] | null })
    | null;

  let location = asLocation(row?.locations ?? null);
  const member: PortalMember | null = row
    ? {
        id: row.id,
        location_id: row.location_id,
        membership_number: row.membership_number,
        membership_status: row.membership_status,
        date_joined: row.date_joined,
        date_of_birth: row.date_of_birth,
        gender: row.gender,
        address: row.address,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
      }
    : null;

  if (!location && current.profile.location_id) {
    const { data: locationData } = await supabase
      .from("locations")
      .select("id, name, code, city, country")
      .eq("id", current.profile.location_id)
      .maybeSingle();
    location = (locationData as LocationJoin) ?? null;
  }

  return {
    current,
    member,
    location,
    locationId: member?.location_id ?? current.profile.location_id,
  };
}

export async function listMyGiving(page = 1, q?: string, status?: string) {
  const { current, member } = await getPortalContext();
  const safePage = parseListPage(String(page));
  const { from, to } = listRange(safePage, PORTAL_GIVING_PAGE_SIZE);

  if (!member) {
    return {
      rows: [] as PortalGivingRow[],
      totals: [] as { currency: string; amount: number }[],
      total: 0,
      page: safePage,
      pageSize: PORTAL_GIVING_PAGE_SIZE,
      pageCount: 1,
    };
  }

  const supabase = await createClient();
  let request = supabase
    .from("giving_transactions")
    .select(
      "id, amount, currency, payment_method, status, transaction_reference, created_at, giving_categories(name)",
      { count: "exact" },
    )
    .eq("member_id", member.id)
    .eq("organization_id", current.organizationId)
    .order("created_at", { ascending: false });

  const pattern = searchPattern(q);
  if (pattern) {
    request = request.ilike("transaction_reference", pattern);
  }
  if (status === "SUCCESS" || status === "PENDING" || status === "FAILED") {
    request = request.eq("status", status);
  }

  const { data, error, count } = await request.range(from, to);

  if (error) {
    logServerError("portal.giving", error);
    return {
      rows: [] as PortalGivingRow[],
      totals: [] as { currency: string; amount: number }[],
      total: 0,
      page: safePage,
      pageSize: PORTAL_GIVING_PAGE_SIZE,
      pageCount: 1,
    };
  }

  const rows = mapGivingRows(data);
  const yearStart = `${new Date().getUTCFullYear()}-01-01T00:00:00.000Z`;
  const { data: yearData } = await supabase
    .from("giving_transactions")
    .select("amount, currency")
    .eq("member_id", member.id)
    .eq("organization_id", current.organizationId)
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

  const total = count ?? 0;
  return {
    rows,
    totals,
    total,
    page: safePage,
    pageSize: PORTAL_GIVING_PAGE_SIZE,
    pageCount: listPageCount(total, PORTAL_GIVING_PAGE_SIZE),
  };
}

function mapGivingRows(data: unknown): PortalGivingRow[] {
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
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
}

export async function listMyEvents() {
  const { current, member } = await getPortalContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, description, venue, start_date, end_date, registration_required, capacity, location_id, locations(name)",
    )
    .eq("organization_id", current.organizationId)
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(20);

  if (error) {
    logServerError("portal.events", error);
    return [] as PortalEvent[];
  }

  const events = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const location = row.locations as { name: string } | { name: string }[] | null;
    return {
      id: String(row.id),
      title: String(row.title),
      description: (row.description as string | null) ?? null,
      venue: (row.venue as string | null) ?? null,
      start_date: String(row.start_date),
      end_date: (row.end_date as string | null) ?? null,
      registration_required: Boolean(row.registration_required),
      capacity: row.capacity == null ? null : Number(row.capacity),
      location_name: Array.isArray(location) ? location[0]?.name ?? null : location?.name ?? null,
      registered: false,
    };
  });

  if (!member || events.length === 0) {
    return events;
  }

  const { data: registrations } = await supabase
    .from("event_registrations")
    .select("event_id, status")
    .eq("member_id", member.id)
    .in(
      "event_id",
      events.map((event) => event.id),
    );

  const registered = new Set(
    ((registrations ?? []) as { event_id: string; status: string }[])
      .filter((row) => row.status === "REGISTERED")
      .map((row) => row.event_id),
  );

  return events.map((event) => ({
    ...event,
    registered: registered.has(event.id),
  }));
}

export async function listMyAnnouncements() {
  const { current } = await getPortalContext();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, message, publish_date, location_id, locations(name)")
    .eq("organization_id", current.organizationId)
    .lte("publish_date", now)
    .or(`expiry_date.is.null,expiry_date.gt.${now}`)
    .order("publish_date", { ascending: false })
    .limit(20);

  if (error) {
    logServerError("portal.announcements", error);
    return [] as PortalAnnouncement[];
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const location = row.locations as { name: string } | { name: string }[] | null;
    return {
      id: String(row.id),
      title: String(row.title),
      message: String(row.message),
      publish_date: String(row.publish_date),
      location_name: Array.isArray(location) ? location[0]?.name ?? null : location?.name ?? null,
    };
  });
}

export async function updateMyProfile(input: unknown) {
  const current = await requireRole("MEMBER");
  const parsed = profileSchema.safeParse(input);

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: emptyToNull(parsed.data.phone),
    } as never)
    .eq("id", current.id)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("portal.profile", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  return { ok: true as const };
}

export async function registerForEvent(eventId: string) {
  const { member } = await getPortalContext();
  if (!member) {
    return { error: "Ask your campus office to link a membership record to your login." };
  }

  const supabase = await createClient();
  const { error: rpcError } = await supabase.rpc("register_for_event" as never, {
    p_event_id: eventId,
  } as never);

  if (!rpcError) {
    await writeAuditLog({
      action: "EVENT_REGISTERED",
      entityType: "event",
      entityId: eventId,
    });
    return { ok: true as const };
  }

  if (!rpcError.message.toLowerCase().includes("could not find")) {
    logServerError("portal.register", rpcError);
    return { error: userSafeDatabaseError(rpcError.message) };
  }

  const events = await listMyEvents();
  const event = events.find((item) => item.id === eventId);
  if (!event) {
    return { error: "That event is not available." };
  }

  if (!event.registration_required) {
    return { error: "This event does not take registrations." };
  }

  const { error } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    member_id: member.id,
    status: "REGISTERED",
  } as never);

  if (error) {
    logServerError("portal.register.insert", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "EVENT_REGISTERED",
    entityType: "event",
    entityId: eventId,
  });
  return { ok: true as const };
}

export async function cancelEventRegistration(eventId: string) {
  const { member } = await getPortalContext();
  if (!member) {
    return { error: "Ask your campus office to link a membership record to your login." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_registrations")
    .update({ status: "CANCELLED" } as never)
    .eq("event_id", eventId)
    .eq("member_id", member.id);

  if (error) {
    logServerError("portal.cancel", error);
    return { error: "Unable to cancel that registration." };
  }

  await writeAuditLog({
    action: "EVENT_REGISTRATION_CANCELLED",
    entityType: "event",
    entityId: eventId,
  });
  return { ok: true as const };
}
