import { listPageCount, listRange, parseListPage, searchPattern } from "@/lib/admin/list-page";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import type { CurrentUser } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { fromDateTimeLocalValue } from "@/lib/utils/format";
import { logServerError } from "@/lib/utils/log-server-error";
import {
  EVENT_REGISTRATION_STATUSES,
  eventSchema,
  type EventWhenFilter,
} from "@/lib/validators/event.schema";
import type { EventRegistrationStatus } from "@/types";

export const CONTENT_ROLES = ["SUPER_ADMIN", "LOCATION_ADMIN"] as const;

export type EventListItem = {
  id: string;
  title: string;
  venue: string | null;
  start_date: string;
  end_date: string | null;
  registration_required: boolean;
  capacity: number | null;
  location_id: string | null;
  location_name: string | null;
  location_code: string | null;
};

export type EventDetail = EventListItem & {
  organization_id: string;
  description: string | null;
};

export type EventRegistrationRow = {
  id: string;
  status: EventRegistrationStatus;
  registered_at: string;
  member_id: string;
  member_name: string;
  membership_number: string;
};

const EVENT_SELECT =
  "id, organization_id, location_id, title, description, venue, start_date, end_date, registration_required, capacity, locations(name, code)";

function staffCampusId(current: CurrentUser) {
  return current.staffLocationIds[0] ?? current.primaryLocationId ?? null;
}

async function resolveListLocation(current: CurrentUser, requested?: string) {
  if (!current.isSuperAdmin) {
    return staffCampusId(current);
  }

  if (requested !== undefined) {
    return requested || null;
  }

  const selection = await getAdminLocationSelection(current);
  return selection.locationId;
}

function mapLocation(row: Record<string, unknown>) {
  const location = row.locations as
    | { name: string; code: string }
    | { name: string; code: string }[]
    | null;
  const locationRow = Array.isArray(location) ? location[0] : location;
  return {
    location_id: (row.location_id as string | null) ?? null,
    location_name: locationRow?.name ?? null,
    location_code: locationRow?.code ?? null,
  };
}

function mapEvent(row: Record<string, unknown>): EventListItem {
  return {
    id: String(row.id),
    title: String(row.title),
    venue: (row.venue as string | null) ?? null,
    start_date: String(row.start_date),
    end_date: (row.end_date as string | null) ?? null,
    registration_required: Boolean(row.registration_required),
    capacity: row.capacity == null ? null : Number(row.capacity),
    ...mapLocation(row),
  };
}

export function canMutateContent(current: CurrentUser, locationId: string | null) {
  if (current.isSuperAdmin) {
    return true;
  }

  return Boolean(locationId && current.staffLocationIds.includes(locationId));
}

function resolveWritableLocation(current: CurrentUser, requested?: string) {
  if (!current.isSuperAdmin) {
    const campus = staffCampusId(current);
    if (!campus) {
      return { error: "Your account is not assigned to a campus." };
    }
    return { locationId: campus };
  }

  const locationId = requested?.trim() || null;
  if (locationId && !current.accessibleLocations.some((location) => location.id === locationId)) {
    return { error: "You do not have access to that location." };
  }

  return { locationId };
}

function parseEventTimes(startValue: string, endValue?: string) {
  const start = fromDateTimeLocalValue(startValue);
  if (!start) {
    return { error: "Enter a valid start date." };
  }

  const end = endValue ? fromDateTimeLocalValue(endValue) : null;
  if (endValue && !end) {
    return { error: "Enter a valid end date." };
  }

  return { start, end };
}

export async function listEvents(query: {
  q?: string;
  locationId?: string;
  when?: EventWhenFilter | "";
  page?: number;
} = {}) {
  const current = await requireRole(CONTENT_ROLES);
  const locationId = await resolveListLocation(current, query.locationId);
  const when = query.when || "upcoming";
  const page = parseListPage(String(query.page ?? 1));
  const { from, to } = listRange(page);
  const supabase = await createClient();
  const now = new Date().toISOString();

  let request = supabase
    .from("events")
    .select(EVENT_SELECT, { count: "exact" })
    .eq("organization_id", current.organizationId)
    .order("start_date", { ascending: when !== "past" });

  if (locationId) {
    request = request.or(`location_id.eq.${locationId},location_id.is.null`);
  }
  if (when === "upcoming") {
    request = request.gte("start_date", now);
  } else if (when === "past") {
    request = request.lt("start_date", now);
  }

  const pattern = searchPattern(query.q);
  if (pattern) {
    request = request.or(`title.ilike.${pattern},venue.ilike.${pattern}`);
  }

  const { data, error, count } = await request.range(from, to);
  if (error) {
    logServerError("event.list", error);
    return {
      events: [] as EventListItem[],
      locationId,
      error: "Unable to load events.",
      page,
      total: 0,
      pageCount: 1,
      pageSize: to - from + 1,
    };
  }

  const total = count ?? 0;
  return {
    events: ((data ?? []) as Array<Record<string, unknown>>).map(mapEvent),
    locationId,
    page,
    total,
    pageCount: listPageCount(total),
    pageSize: to - from + 1,
  };
}

export async function getEvent(eventId: string) {
  const current = await requireRole(CONTENT_ROLES);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", eventId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("event.get", error);
    return { event: null as EventDetail | null, error: "Unable to load that event." };
  }

  if (!data) {
    return { event: null as EventDetail | null };
  }

  const row = data as Record<string, unknown>;
  return {
    event: {
      ...mapEvent(row),
      organization_id: String(row.organization_id),
      description: (row.description as string | null) ?? null,
    } satisfies EventDetail,
  };
}

export async function listEventRegistrations(eventId: string) {
  const existing = await getEvent(eventId);
  if (!existing.event) {
    return { rows: [] as EventRegistrationRow[], error: existing.error ?? "That event is not available." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_registrations")
    .select("id, status, registered_at, member_id, members(first_name, last_name, membership_number)")
    .eq("event_id", eventId)
    .order("registered_at", { ascending: true });

  if (error) {
    logServerError("event.registrations", error);
    return { rows: [] as EventRegistrationRow[], error: "Unable to load registrations." };
  }

  return {
    rows: ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const member = row.members as
        | { first_name: string | null; last_name: string | null; membership_number: string }
        | { first_name: string | null; last_name: string | null; membership_number: string }[]
        | null;
      const memberRow = Array.isArray(member) ? member[0] : member;
      const name = [memberRow?.first_name, memberRow?.last_name].filter(Boolean).join(" ").trim();

      return {
        id: String(row.id),
        status: row.status as EventRegistrationStatus,
        registered_at: String(row.registered_at),
        member_id: String(row.member_id),
        member_name: name || memberRow?.membership_number || "Unnamed member",
        membership_number: memberRow?.membership_number ?? "—",
      };
    }),
  };
}

export async function createEvent(input: unknown) {
  const current = await requireRole(CONTENT_ROLES);
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const location = resolveWritableLocation(current, parsed.data.location_id);
  if ("error" in location) {
    return { error: location.error };
  }

  const times = parseEventTimes(parsed.data.start_date, parsed.data.end_date);
  if ("error" in times) {
    return { error: times.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: current.organizationId,
      location_id: location.locationId,
      title: parsed.data.title,
      description: emptyToNull(parsed.data.description),
      venue: emptyToNull(parsed.data.venue),
      start_date: times.start,
      end_date: times.end,
      registration_required: parsed.data.registration_required,
      capacity: parsed.data.capacity ? Number(parsed.data.capacity) : null,
      created_by: current.id,
    } as never)
    .select("id")
    .single();

  if (error) {
    logServerError("event.create", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const created = data as { id: string } | null;
  await writeAuditLog({
    action: "EVENT_CREATED",
    entityType: "event",
    entityId: created?.id,
    metadata: { title: parsed.data.title, location_id: location.locationId },
  });

  return { id: created?.id };
}

export async function updateEvent(eventId: string, input: unknown) {
  const current = await requireRole(CONTENT_ROLES);
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getEvent(eventId);
  if (!existing.event) {
    return { error: "That event is not available." };
  }

  if (!canMutateContent(current, existing.event.location_id)) {
    return { error: "You can only change events for your campus." };
  }

  const location = resolveWritableLocation(
    current,
    current.isSuperAdmin ? parsed.data.location_id : existing.event.location_id ?? undefined,
  );
  if ("error" in location) {
    return { error: location.error };
  }

  if (!current.isSuperAdmin && location.locationId !== existing.event.location_id) {
    return { error: "You can only change events for your campus." };
  }

  const times = parseEventTimes(parsed.data.start_date, parsed.data.end_date);
  if ("error" in times) {
    return { error: times.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({
      location_id: location.locationId,
      title: parsed.data.title,
      description: emptyToNull(parsed.data.description),
      venue: emptyToNull(parsed.data.venue),
      start_date: times.start,
      end_date: times.end,
      registration_required: parsed.data.registration_required,
      capacity: parsed.data.capacity ? Number(parsed.data.capacity) : null,
    } as never)
    .eq("id", eventId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("event.update", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "EVENT_UPDATED",
    entityType: "event",
    entityId: eventId,
    metadata: { title: parsed.data.title, location_id: location.locationId },
  });

  return { ok: true as const };
}

export async function deleteEvent(eventId: string) {
  const current = await requireRole(CONTENT_ROLES);
  const existing = await getEvent(eventId);
  if (!existing.event) {
    return { error: "That event is not available." };
  }

  if (!canMutateContent(current, existing.event.location_id)) {
    return { error: "You can only delete events for your campus." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("event.delete", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "EVENT_DELETED",
    entityType: "event",
    entityId: eventId,
    metadata: { title: existing.event.title },
  });

  return { ok: true as const };
}

export async function setEventRegistrationStatus(
  eventId: string,
  registrationId: string,
  status: EventRegistrationStatus,
) {
  const current = await requireRole(CONTENT_ROLES);
  if (!EVENT_REGISTRATION_STATUSES.includes(status)) {
    return { error: "That registration status is not valid." };
  }

  const existing = await getEvent(eventId);
  if (!existing.event) {
    return { error: "That event is not available." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_registrations")
    .update({ status } as never)
    .eq("id", registrationId)
    .eq("event_id", eventId);

  if (error) {
    logServerError("event.registration", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "EVENT_REGISTRATION_UPDATED",
    entityType: "event_registration",
    entityId: registrationId,
    metadata: { event_id: eventId, status, actor: current.id },
  });

  return { ok: true as const };
}
