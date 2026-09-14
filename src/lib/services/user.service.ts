import { requireRole } from "@/lib/auth/require-role";
import { roleLabel } from "@/lib/auth/permissions";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/log-server-error";
import type { AppRole, ProfileStatus } from "@/types";
import { APP_ROLES, PROFILE_STATUSES } from "@/types";

import { LIST_PAGE_SIZE } from "@/lib/admin/list-page";

export const USER_PAGE_SIZE = LIST_PAGE_SIZE;

export type StaffDirectoryRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  campus: string;
  roles: string[];
};

function isProfileStatus(value: string): value is ProfileStatus {
  return (PROFILE_STATUSES as readonly string[]).includes(value);
}

function isAppRoleName(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
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
} = {}) {
  const current = await requireRole("SUPER_ADMIN");
  const supabase = await createClient();
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * USER_PAGE_SIZE;
  const to = from + USER_PAGE_SIZE - 1;
  const roleFilter = query.role && isAppRoleName(query.role) ? query.role : "";

  const [roleRows, emails] = await Promise.all([
    supabase
      .from("user_roles")
      .select("user_id, roles(name), locations(name, code)")
      .eq("organization_id", current.organizationId),
    loadEmailsByUserId(),
  ]);

  const rolesByUser = new Map<string, string[]>();
  for (const row of (roleRows.data ?? []) as Array<Record<string, unknown>>) {
    const role = row.roles as { name: string } | { name: string }[] | null;
    const location = row.locations as { name: string; code: string } | { name: string; code: string }[] | null;
    const roleName = Array.isArray(role) ? role[0]?.name : role?.name;
    if (!roleName || !isAppRoleName(roleName)) {
      continue;
    }
    const locationRow = Array.isArray(location) ? location[0] : location;
    const label = locationRow
      ? `${roleLabel(roleName)} · ${locationRow.name}`
      : roleLabel(roleName);
    const userId = String(row.user_id);
    rolesByUser.set(userId, [...(rolesByUser.get(userId) ?? []), label]);
  }

  let request = supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, status, locations(name, code)", { count: "exact" })
    .eq("organization_id", current.organizationId)
    .order("last_name")
    .range(from, to);

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
      .filter(([, labels]) => labels.some((label) => label.startsWith(roleLabel(roleFilter))))
      .map(([id]) => id);
    request = request.in("id", matchingIds.length ? matchingIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const profiles = await request;

  if (profiles.error) {
    logServerError("users.list", profiles.error);
    return {
      rows: [] as StaffDirectoryRow[],
      total: 0,
      page,
      currentUserId: current.id,
      error: "Unable to load users.",
    };
  }
  if (roleRows.error) {
    logServerError("users.roles", roleRows.error);
  }

  const rows = ((profiles.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const location = row.locations as
      | { name: string; code: string }
      | { name: string; code: string }[]
      | null;
    const locationRow = Array.isArray(location) ? location[0] : location;
    const id = String(row.id);
    return {
      id,
      name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "Unnamed user",
      email: emails[id] ?? "—",
      phone: (row.phone as string | null) ?? null,
      status: String(row.status),
      campus: locationRow ? `${locationRow.name} (${locationRow.code})` : "Organization",
      roles: rolesByUser.get(id) ?? ["No role"],
    };
  });

  return {
    rows,
    total: profiles.count ?? 0,
    page,
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
