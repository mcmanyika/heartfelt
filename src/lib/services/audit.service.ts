import { requireRole } from "@/lib/auth/require-role";
import type { SortDir } from "@/lib/admin/sort";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/log-server-error";
import type { Database, Json } from "@/types/database.types";

export const AUDIT_PAGE_SIZE = 20;

export const AUDIT_SORTS = ["when", "actor", "action", "entity", "details"] as const;

export type AuditSort = (typeof AUDIT_SORTS)[number];

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Json;
  ip_address: string | null;
  created_at: string;
  actor_name: string;
};

export async function writeAuditLog(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Json;
  ipAddress?: string | null;
}) {
  const supabase = await createClient();
  const args: Database["public"]["Functions"]["write_audit_log"]["Args"] = {
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? undefined,
    p_metadata: input.metadata,
    p_ip_address: input.ipAddress ?? undefined,
  };

  const { error } = await supabase.rpc("write_audit_log", args as never);
  if (error) {
    logServerError("audit.write", error);
  }
}

export async function listAuditLogs(query: {
  q?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page?: number;
  sort?: AuditSort;
  dir?: SortDir;
} = {}) {
  const { organizationId } = await requireRole("SUPER_ADMIN");
  const supabase = await createClient();
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * AUDIT_PAGE_SIZE;
  const to = from + AUDIT_PAGE_SIZE - 1;
  const sort = query.sort ?? "when";
  const ascending = (query.dir ?? "desc") === "asc";
  const options = { ascending, nullsFirst: false as const };

  let request = supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, ip_address, created_at, user_id, profiles(first_name, last_name)", {
      count: "exact",
    })
    .eq("organization_id", organizationId);

  const search = query.q?.trim();
  if (search) {
    const pattern = `%${search.replace(/,/g, "")}%`;
    request = request.or(`action.ilike.${pattern},entity_type.ilike.${pattern}`);
  }
  if (query.entityType) {
    request = request.eq("entity_type", query.entityType);
  }
  if (query.from) {
    request = request.gte("created_at", `${query.from}T00:00:00.000Z`);
  }
  if (query.to) {
    request = request.lte("created_at", `${query.to}T23:59:59.999Z`);
  }

  if (sort === "actor") {
    request = request
      .order("profiles(last_name)" as never, options as never)
      .order("profiles(first_name)" as never, options as never);
  } else if (sort === "action") {
    request = request.order("action", options);
  } else if (sort === "entity") {
    request = request.order("entity_type", options).order("entity_id", options);
  } else if (sort === "details") {
    request = request.order("ip_address", options);
  } else {
    request = request.order("created_at", options);
  }

  const { data, error, count } = await request.range(from, to);
  if (error) {
    logServerError("audit.list", error);
    return {
      rows: [] as AuditLogRow[],
      total: 0,
      page,
      pageSize: AUDIT_PAGE_SIZE,
      pageCount: 1,
      error: "Unable to load the audit log.",
    };
  }

  const total = count ?? 0;
  return {
    rows: ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const profile = row.profiles as
        | { first_name: string; last_name: string }
        | { first_name: string; last_name: string }[]
        | null;
      const actor = Array.isArray(profile) ? profile[0] : profile;
      const name = [actor?.first_name, actor?.last_name].filter(Boolean).join(" ").trim();

      return {
        id: String(row.id),
        action: String(row.action),
        entity_type: String(row.entity_type),
        entity_id: (row.entity_id as string | null) ?? null,
        metadata: (row.metadata ?? {}) as Json,
        ip_address: (row.ip_address as string | null) ?? null,
        created_at: String(row.created_at),
        actor_name: name || "System",
      };
    }),
    total,
    page,
    pageSize: AUDIT_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
  };
}
