import { listPageCount, listRange, parseListPage, searchPattern } from "@/lib/admin/list-page";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/services/audit.service";
import { emptyToNull, firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import { locationSchema } from "@/lib/validators/location.schema";
import type { Location, LocationStatus } from "@/types";

export type LocationListItem = Location & {
  member_count: number;
  terminal_count: number;
};

type LocationEmbed = Location & {
  members: { count: number }[] | null;
  payment_terminals: { count: number }[] | null;
};

function mapLocationRow(row: LocationEmbed): LocationListItem {
  return {
    ...row,
    member_count: row.members?.[0]?.count ?? 0,
    terminal_count: row.payment_terminals?.[0]?.count ?? 0,
  };
}

export async function listLocations(query: {
  q?: string;
  status?: LocationStatus | "";
  page?: number;
} = {}) {
  const current = await requireRole("SUPER_ADMIN");
  const page = parseListPage(String(query.page ?? 1));
  const { from, to } = listRange(page);
  const supabase = await createClient();
  let request = supabase
    .from("locations")
    .select(
      "id, organization_id, name, code, country, city, address, phone, email, status, created_at, updated_at, members(count), payment_terminals(count)",
      { count: "exact" },
    )
    .eq("organization_id", current.organizationId)
    .order("name");

  if (query.status) {
    request = request.eq("status", query.status);
  }

  const pattern = searchPattern(query.q);
  if (pattern) {
    request = request.or(
      `name.ilike.${pattern},code.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await request.range(from, to);

  if (error) {
    logServerError("location.list", error);
    return {
      error: "Unable to load locations." as const,
      locations: [] as LocationListItem[],
      page,
      total: 0,
      pageCount: 1,
      pageSize: to - from + 1,
    };
  }

  const total = count ?? 0;
  return {
    locations: ((data ?? []) as unknown as LocationEmbed[]).map(mapLocationRow),
    page,
    total,
    pageCount: listPageCount(total),
    pageSize: to - from + 1,
  };
}

export async function getLocation(locationId: string) {
  const current = await requireRole("SUPER_ADMIN");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select(
      "id, organization_id, name, code, country, city, address, phone, email, status, created_at, updated_at, members(count), payment_terminals(count)",
    )
    .eq("id", locationId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (error) {
    logServerError("location.get", error);
    return { error: "Unable to load that location." as const };
  }

  if (!data) {
    return { error: "Location not found." as const };
  }

  return { location: mapLocationRow(data as unknown as LocationEmbed) };
}

export async function createLocation(input: unknown) {
  const current = await requireRole("SUPER_ADMIN");
  const parsed = locationSchema.safeParse(input);

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .insert({
      organization_id: current.organizationId,
      name: parsed.data.name,
      code: parsed.data.code,
      country: parsed.data.country,
      city: parsed.data.city,
      address: emptyToNull(parsed.data.address),
      phone: emptyToNull(parsed.data.phone),
      email: emptyToNull(parsed.data.email),
      status: parsed.data.status,
    } as never)
    .select("id")
    .single();

  if (error) {
    logServerError("location.create", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  const created = data as { id: string } | null;
  await writeAuditLog({
    action: "LOCATION_CREATED",
    entityType: "location",
    entityId: created?.id,
    metadata: { code: parsed.data.code },
  });

  return { id: created?.id };
}

export async function updateLocation(locationId: string, input: unknown) {
  const current = await requireRole("SUPER_ADMIN");
  const parsed = locationSchema.safeParse(input);

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const existing = await getLocation(locationId);
  if ("error" in existing && existing.error) {
    return { error: existing.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .update({
      name: parsed.data.name,
      code: parsed.data.code,
      country: parsed.data.country,
      city: parsed.data.city,
      address: emptyToNull(parsed.data.address),
      phone: emptyToNull(parsed.data.phone),
      email: emptyToNull(parsed.data.email),
      status: parsed.data.status,
    } as never)
    .eq("id", locationId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("location.update", error);
    return { error: userSafeDatabaseError(error.message) };
  }

  await writeAuditLog({
    action: "LOCATION_UPDATED",
    entityType: "location",
    entityId: locationId,
    metadata: { code: parsed.data.code },
  });

  return { ok: true as const };
}

export async function setLocationStatus(locationId: string, status: LocationStatus) {
  const current = await requireRole("SUPER_ADMIN");
  const existing = await getLocation(locationId);
  if ("error" in existing && existing.error) {
    return { error: existing.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .update({ status } as never)
    .eq("id", locationId)
    .eq("organization_id", current.organizationId);

  if (error) {
    logServerError("location.status", error);
    return { error: "Unable to update location status." };
  }

  await writeAuditLog({
    action: "LOCATION_UPDATED",
    entityType: "location",
    entityId: locationId,
    metadata: { status },
  });

  return { ok: true as const };
}
