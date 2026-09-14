import { listPageCount, listRange, parseListPage, searchPattern } from "@/lib/admin/list-page";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import type { CurrentUser } from "@/lib/auth/types";
import { canMutateContent, CONTENT_ROLES } from "@/lib/services/event.service";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createClient } from "@/lib/supabase/server";
import { firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { fromDateTimeLocalValue } from "@/lib/utils/format";
import { logServerError } from "@/lib/utils/log-server-error";
import {
  announcementSchema,
  type AnnouncementStatusFilter,
} from "@/lib/validators/announcement.schema";

export type AnnouncementListItem = {
  id: string;
  title: string;
  message: string;
  publish_date: string;
  expiry_date: string | null;
  location_id: string | null;
  location_name: string | null;
  location_code: string | null;
};

export type AnnouncementDetail = AnnouncementListItem & {
  organization_id: string;
};

const ANNOUNCEMENT_SELECT =
  "id, organization_id, location_id, title, message, publish_date, expiry_date, locations(name, code)";

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

function mapAnnouncement(row: Record<string, unknown>): AnnouncementListItem {
  const location = row.locations as
    | { name: string; code: string }
    | { name: string; code: string }[]
    | null;
  const locationRow = Array.isArray(location) ? location[0] : location;

  return {
    id: String(row.id),
    title: String(row.title),
    message: String(row.message),
    publish_date: String(row.publish_date),
    expiry_date: (row.expiry_date as string | null) ?? null,
    location_id: (row.location_id as string | null) ?? null,
    location_name: locationRow?.name ?? null,
    location_code: locationRow?.code ?? null,
  };
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

function parseAnnouncementTimes(publishValue: string, expiryValue?: string) {
  const publish = fromDateTimeLocalValue(publishValue);
  if (!publish) {
    return { error: "Enter a valid publish date." };
  }

  const expiry = expiryValue ? fromDateTimeLocalValue(expiryValue) : null;
  if (expiryValue && !expiry) {
    return { error: "Enter a valid expiry date." };
  }

  return { publish, expiry };
}

export async function listAnnouncements(query: {
  q?: string;
  locationId?: string;
  status?: AnnouncementStatusFilter | "";
  page?: number;
} = {}) {
  const current = await requireRole(CONTENT_ROLES);
  const locationId = await resolveListLocation(current, query.locationId);
  const status = query.status || "all";
  const page = parseListPage(String(query.page ?? 1));
  const { from, to } = listRange(page);
  const supabase = await createClient();
  const now = new Date().toISOString();

  let request = supabase
    .from("announcements")
    .select(ANNOUNCEMENT_SELECT, { count: "exact" })
    .eq("organization_id", current.organizationId)
    .order("publish_date", { ascending: false });

  if (locationId) {
    request = request.or(`location_id.eq.${locationId},location_id.is.null`);
  }
  if (status === "current") {
    request = request.lte("publish_date", now).or(`expiry_date.is.null,expiry_date.gt.${now}`);
  } else if (status === "scheduled") {
    request = request.gt("publish_date", now);
  } else if (status === "expired") {
    request = request.lte("expiry_date", now);
  }

  const pattern = searchPattern(query.q);
  if (pattern) {
    request = request.or(`title.ilike.${pattern},message.ilike.${pattern}`);
  }

  const { data, error, count } = await request.range(from, to);
  if (error) {
    logServerError("announcement.list", error);
    return {
      announcements: [] as AnnouncementListItem[],
      locationId,
      error: "Unable to load announcements.",
      page,
      total: 0,
      pageCount: 1,
      pageSize: to - from + 1,
    };
  }

  const total = count ?? 0;
  return {
    announcements: ((data ?? []) as Array<Record<string, unknown>>).map(mapAnnouncement),
    locationId,
    page,
    total,
    pageCount: listPageCount(total),
    pageSize: to - from + 1,
  };
}

export async function getAnnouncement(announcementId: string) {
  const current = await requireRole(CONTENT_ROLES);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select(ANNOUNCEMENT_SELECT)
    .eq("id", announcementId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("announcement.get", error);
    return { announcement: null as AnnouncementDetail | null, error: "Unable to load that announcement." };
  }

  if (!data) {
    return { announcement: null as AnnouncementDetail | null };
  }

  const row = data as Record<string, unknown>;
  return {
    announcement: {
      ...mapAnnouncement(row),
      organization_id: String(row.organization_id),
    } satisfies AnnouncementDetail,
  };
}

export async function createAnnouncement(input: unknown) {
  const current = await requireRole(CONTENT_ROLES);
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const location = resolveWritableLocation(current, parsed.data.location_id);
  if ("error" in location) {
    return { error: location.error };
  }

  const times = parseAnnouncementTimes(parsed.data.publish_date, parsed.data.expiry_date);
  if ("error" in times) {
    return { error: times.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      organization_id: current.organizationId,
      location_id: location.locationId,
      title: parsed.data.title,
      message: parsed.data.message,
      publish_date: times.publish,
      expiry_date: times.expiry,
      created_by: current.id,
    } as never)
    .select("id")
    .single();

  if (error) {
    logServerError("announcement.create", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const created = data as { id: string } | null;
  await writeAuditLog({
    action: "ANNOUNCEMENT_CREATED",
    entityType: "announcement",
    entityId: created?.id,
    metadata: { title: parsed.data.title, location_id: location.locationId },
  });

  return { id: created?.id };
}

export async function updateAnnouncement(announcementId: string, input: unknown) {
  const current = await requireRole(CONTENT_ROLES);
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getAnnouncement(announcementId);
  if (!existing.announcement) {
    return { error: "That announcement is not available." };
  }

  if (!canMutateContent(current, existing.announcement.location_id)) {
    return { error: "You can only change announcements for your campus." };
  }

  const location = resolveWritableLocation(
    current,
    current.isSuperAdmin ? parsed.data.location_id : existing.announcement.location_id ?? undefined,
  );
  if ("error" in location) {
    return { error: location.error };
  }

  if (!current.isSuperAdmin && location.locationId !== existing.announcement.location_id) {
    return { error: "You can only change announcements for your campus." };
  }

  const times = parseAnnouncementTimes(parsed.data.publish_date, parsed.data.expiry_date);
  if ("error" in times) {
    return { error: times.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({
      location_id: location.locationId,
      title: parsed.data.title,
      message: parsed.data.message,
      publish_date: times.publish,
      expiry_date: times.expiry,
    } as never)
    .eq("id", announcementId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("announcement.update", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "ANNOUNCEMENT_UPDATED",
    entityType: "announcement",
    entityId: announcementId,
    metadata: { title: parsed.data.title, location_id: location.locationId },
  });

  return { ok: true as const };
}

export async function deleteAnnouncement(announcementId: string) {
  const current = await requireRole(CONTENT_ROLES);
  const existing = await getAnnouncement(announcementId);
  if (!existing.announcement) {
    return { error: "That announcement is not available." };
  }

  if (!canMutateContent(current, existing.announcement.location_id)) {
    return { error: "You can only delete announcements for your campus." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("announcement.delete", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "ANNOUNCEMENT_DELETED",
    entityType: "announcement",
    entityId: announcementId,
    metadata: { title: existing.announcement.title },
  });

  return { ok: true as const };
}
