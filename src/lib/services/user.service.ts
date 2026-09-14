import { listPageCount } from "@/lib/admin/list-page";
import type { SortDir } from "@/lib/admin/sort";
import { requireRole } from "@/lib/auth/require-role";
import { roleLabel } from "@/lib/auth/permissions";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { firstZodError, userSafeDatabaseError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import { setUserRolesSchema } from "@/lib/validators/user.schema";
import type { AppRole, ProfileStatus } from "@/types";
import { APP_ROLES, PROFILE_STATUSES } from "@/types";

export const USER_PAGE_SIZE = 20;

export const USER_SORTS = ["name", "email", "campus", "roles", "status"] as const;

export type UserSort = (typeof USER_SORTS)[number];

export type StaffRoleAssignment = {
  role: AppRole;
  locationId: string | null;
  locationName: string | null;
  label: string;
};

export type StaffDirectoryRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  campus: string;
  locationId: string | null;
  roles: string[];
  assignments: StaffRoleAssignment[];
};

function isProfileStatus(value: string): value is ProfileStatus {
  return (PROFILE_STATUSES as readonly string[]).includes(value);
}

function isAppRoleName(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

function compareText(left: string, right: string, ascending: boolean) {
  const a = left.trim() && left !== "—" ? left : "\uffff";
  const b = right.trim() && right !== "—" ? right : "\uffff";
  const delta = a.localeCompare(b, undefined, { sensitivity: "base" });
  return ascending ? delta : -delta;
}

async function loadEmailsByUserId() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) {
      logServerError("users.emails", error);
      return {} as Record<string, string>;
    }

    return Object.fromEntries(
      (data.users ?? [])
        .filter((user) => user.email)
        .map((user) => [user.id, user.email as string]),
    );
  } catch (error) {
    logServerError("users.emails", error);
    return {} as Record<string, string>;
  }
}

export async function listDirectoryUsers(query: {
  q?: string;
  role?: string;
  status?: string;
  page?: number;
  sort?: UserSort;
  dir?: SortDir;
} = {}) {
  const current = await requireRole("SUPER_ADMIN");
  const supabase = await createClient();
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * USER_PAGE_SIZE;
  const to = from + USER_PAGE_SIZE - 1;
  const sort = query.sort ?? "name";
  const ascending = (query.dir ?? "asc") === "asc";
  const options = { ascending, nullsFirst: false as const };
  const memorySort = sort === "email" || sort === "roles";
  const roleFilter = query.role && isAppRoleName(query.role) ? query.role : "";

  const [roleRows, emails] = await Promise.all([
    supabase
      .from("user_roles")
      .select("user_id, location_id, roles(name), locations(id, name, code)")
      .eq("organization_id", current.organizationId),
    loadEmailsByUserId(),
  ]);

  const rolesByUser = new Map<string, StaffRoleAssignment[]>();
  for (const row of (roleRows.data ?? []) as Array<Record<string, unknown>>) {
    const role = row.roles as { name: string } | { name: string }[] | null;
    const location = row.locations as
      | { id: string; name: string; code: string }
      | { id: string; name: string; code: string }[]
      | null;
    const roleName = Array.isArray(role) ? role[0]?.name : role?.name;
    if (!roleName || !isAppRoleName(roleName)) {
      continue;
    }
    const locationRow = Array.isArray(location) ? location[0] : location;
    const locationId = (row.location_id as string | null) ?? locationRow?.id ?? null;
    const assignment: StaffRoleAssignment = {
      role: roleName,
      locationId,
      locationName: locationRow?.name ?? null,
      label: locationRow ? `${roleLabel(roleName)} · ${locationRow.name}` : roleLabel(roleName),
    };
    const userId = String(row.user_id);
    rolesByUser.set(userId, [...(rolesByUser.get(userId) ?? []), assignment]);
  }

  let request = supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, status, location_id, locations(id, name, code)", {
      count: "exact",
    })
    .eq("organization_id", current.organizationId);

  const search = query.q?.trim();
  if (search) {
    const pattern = `%${search.replace(/,/g, "")}%`;
    request = request.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern}`);
  }
  if (query.status && isProfileStatus(query.status)) {
    request = request.eq("status", query.status);
  }
  if (roleFilter) {
    const matchingIds = [...rolesByUser.entries()]
      .filter(([, assignments]) => assignments.some((assignment) => assignment.role === roleFilter))
      .map(([id]) => id);
    request = request.in("id", matchingIds.length ? matchingIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  if (sort === "name") {
    request = request.order("last_name", options).order("first_name", options);
  } else if (sort === "campus") {
    request = request.order("locations(name)" as never, options as never);
  } else if (sort === "status") {
    request = request.order("status", options);
  } else if (!memorySort) {
    request = request.order("last_name", options).order("first_name", options);
  }

  const profiles = memorySort ? await request : await request.range(from, to);

  if (profiles.error) {
    logServerError("users.list", profiles.error);
    return {
      rows: [] as StaffDirectoryRow[],
      total: 0,
      page,
      pageSize: USER_PAGE_SIZE,
      pageCount: 1,
      currentUserId: current.id,
      error: "Unable to load users.",
    };
  }
  if (roleRows.error) {
    logServerError("users.roles", roleRows.error);
  }

  let rows = ((profiles.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const location = row.locations as
      | { id: string; name: string; code: string }
      | { id: string; name: string; code: string }[]
      | null;
    const locationRow = Array.isArray(location) ? location[0] : location;
    const id = String(row.id);
    const assignments = rolesByUser.get(id) ?? [];
    return {
      id,
      name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "Unnamed user",
      email: emails[id] ?? "—",
      phone: (row.phone as string | null) ?? null,
      status: String(row.status),
      campus: locationRow ? `${locationRow.name} (${locationRow.code})` : "Organization",
      locationId: (row.location_id as string | null) ?? locationRow?.id ?? null,
      roles: assignments.length ? assignments.map((assignment) => assignment.label) : ["No role"],
      assignments,
    };
  });

  if (memorySort) {
    rows = [...rows].sort((left, right) => {
      if (sort === "email") {
        return compareText(left.email, right.email, ascending);
      }
      return compareText(left.roles.join(", "), right.roles.join(", "), ascending);
    });
    rows = rows.slice(from, to + 1);
  }

  const total = profiles.count ?? 0;
  return {
    rows,
    total,
    page,
    pageSize: USER_PAGE_SIZE,
    pageCount: listPageCount(total, USER_PAGE_SIZE),
    currentUserId: current.id,
  };
}

export async function setProfileStatus(userId: string, status: string) {
  const current = await requireRole("SUPER_ADMIN");
  if (!isProfileStatus(status)) {
    return { error: "Choose a valid account status." };
  }
  if (userId === current.id) {
    return { error: "You cannot change your own account status." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ status } as never)
    .eq("id", userId)
    .eq("organization_id", current.organizationId)
    .select("id")
    .maybeSingle();

  if (error) {
    logServerError("users.status", error);
    return { error: "Unable to update that account." };
  }
  if (!data) {
    return { error: "That account was not found." };
  }

  await writeAuditLog({
    action: "PROFILE_STATUS_UPDATED",
    entityType: "profile",
    entityId: userId,
    metadata: { status },
  });

  return { ok: true as const };
}

function assignmentKey(roleId: string, locationId: string | null) {
  return `${roleId}:${locationId ?? ""}`;
}

export async function setUserRoles(input: unknown) {
  const current = await requireRole("SUPER_ADMIN");
  const parsed = setUserRolesSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { user_id: userId, assignments } = parsed.data;
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, location_id")
    .eq("id", userId)
    .eq("organization_id", current.organizationId)
    .maybeSingle();

  if (profileError) {
    logServerError("users.roles.profile", profileError);
    return { error: "Unable to update roles for that account." };
  }
  if (!profile) {
    return { error: "That account was not found." };
  }

  const { data: roleRows, error: roleError } = await supabase.from("roles").select("id, name");
  if (roleError || !roleRows?.length) {
    logServerError("users.roles.lookup", roleError);
    return { error: "Unable to load roles." };
  }

  const roleIdByName = new Map(
    (roleRows as Array<{ id: string; name: string }>)
      .filter((row) => isAppRoleName(row.name))
      .map((row) => [row.name as AppRole, row.id]),
  );

  const locationIds = [
    ...new Set(
      assignments
        .filter((assignment) => assignment.role !== "SUPER_ADMIN" && assignment.location_id)
        .map((assignment) => assignment.location_id as string),
    ),
  ];

  if (locationIds.length > 0) {
    const { data: locations, error: locationError } = await supabase
      .from("locations")
      .select("id")
      .eq("organization_id", current.organizationId)
      .in("id", locationIds);

    if (locationError) {
      logServerError("users.roles.locations", locationError);
      return { error: "Unable to update roles for that account." };
    }
    if ((locations ?? []).length !== locationIds.length) {
      return { error: "Choose a valid campus." };
    }
  }

  const uniqueDesired: Array<{ role: AppRole; role_id: string; location_id: string | null }> = [];
  const desiredKeys = new Set<string>();
  for (const assignment of assignments) {
    const roleId = roleIdByName.get(assignment.role);
    if (!roleId) {
      return { error: "Choose a valid role." };
    }
    const locationId = assignment.role === "SUPER_ADMIN" ? null : (assignment.location_id || null);
    const key = assignmentKey(roleId, locationId);
    if (desiredKeys.has(key)) {
      continue;
    }
    desiredKeys.add(key);
    uniqueDesired.push({ role: assignment.role, role_id: roleId, location_id: locationId });
  }

  if (uniqueDesired.length === 0) {
    return { error: "Assign at least one role." };
  }

  const wantsSuperAdmin = uniqueDesired.some((row) => row.role === "SUPER_ADMIN");
  if (userId === current.id && current.isSuperAdmin && !wantsSuperAdmin) {
    return { error: "You cannot remove your own Super Admin role." };
  }

  const superRoleId = roleIdByName.get("SUPER_ADMIN");
  if (superRoleId && !wantsSuperAdmin) {
    const { count: remainingAdmins, error: adminCountError } = await supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", current.organizationId)
      .eq("role_id", superRoleId)
      .neq("user_id", userId);

    if (adminCountError) {
      logServerError("users.roles.admins", adminCountError);
      return { error: "Unable to update roles for that account." };
    }

    const { count: selfAdmin, error: selfAdminError } = await supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", current.organizationId)
      .eq("role_id", superRoleId)
      .eq("user_id", userId);

    if (selfAdminError) {
      logServerError("users.roles.self-admin", selfAdminError);
      return { error: "Unable to update roles for that account." };
    }

    if ((selfAdmin ?? 0) > 0 && (remainingAdmins ?? 0) === 0) {
      return { error: "At least one Super Admin is required." };
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from("user_roles")
    .select("id, role_id, location_id")
    .eq("user_id", userId)
    .eq("organization_id", current.organizationId);

  if (existingError) {
    logServerError("users.roles.existing", existingError);
    return { error: "Unable to update roles for that account." };
  }

  const existingRows = (existing ?? []) as Array<{
    id: string;
    role_id: string;
    location_id: string | null;
  }>;
  const existingByKey = new Map(
    existingRows.map((row) => [assignmentKey(row.role_id, row.location_id), row]),
  );
  const toInsert = uniqueDesired.filter(
    (row) => !existingByKey.has(assignmentKey(row.role_id, row.location_id)),
  );
  const toDelete = existingRows.filter(
    (row) => !desiredKeys.has(assignmentKey(row.role_id, row.location_id)),
  );

  if (toInsert.length > 0) {
    const { error } = await supabase.from("user_roles").insert(
      toInsert.map((row) => ({
        user_id: userId,
        role_id: row.role_id,
        organization_id: current.organizationId,
        location_id: row.location_id,
      })) as never,
    );
    if (error) {
      logServerError("users.roles.insert", error);
      return { error: userSafeDatabaseError(error.message) };
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", current.organizationId)
      .in(
        "id",
        toDelete.map((row) => row.id),
      );
    if (error) {
      logServerError("users.roles.delete", error);
      return { error: userSafeDatabaseError(error.message) };
    }
  }

  const nextLocationId = uniqueDesired.find((row) => row.location_id)?.location_id ?? null;
  const profileRow = profile as { id: string; location_id: string | null };
  if (nextLocationId && nextLocationId !== profileRow.location_id) {
    const { error } = await supabase
      .from("profiles")
      .update({ location_id: nextLocationId } as never)
      .eq("id", userId)
      .eq("organization_id", current.organizationId);
    if (error) {
      logServerError("users.roles.profile-location", error);
    }
  }

  await writeAuditLog({
    action: "USER_ROLES_UPDATED",
    entityType: "profile",
    entityId: userId,
    metadata: {
      assignments: uniqueDesired.map((row) => ({
        role: row.role,
        location_id: row.location_id,
      })),
    },
  });

  return { ok: true as const };
}
