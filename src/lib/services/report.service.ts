import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import { listScopedTransactions, summarizeGiving } from "@/lib/services/giving.service";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/log-server-error";

export type ReportBucket = {
  label: string;
  count: number;
  totals: Record<string, number>;
};

export type MembersByLocationRow = {
  id: string;
  name: string;
  code: string;
  members: number;
};

export type TerminalActivityRow = {
  id: string;
  terminal_code: string;
  device_name: string;
  status: string;
  last_seen_at: string | null;
  location_name: string;
  transaction_count: number;
  totals: Record<string, number>;
};

function incrementTotals(totals: Record<string, number>, currency: string, amount: number) {
  totals[currency] = (totals[currency] ?? 0) + amount;
}

function bucketsFromRows(
  rows: Array<Record<string, unknown>>,
  keyFor: (row: Record<string, unknown>) => string,
) {
  const buckets: Record<string, ReportBucket> = {};
  for (const row of rows) {
    const label = keyFor(row);
    buckets[label] = buckets[label] ?? { label, count: 0, totals: {} };
    buckets[label].count += 1;
    incrementTotals(buckets[label].totals, String(row.currency), Number(row.amount));
  }
  return Object.values(buckets);
}

export async function getStaffReport(range: { from: string; to: string; locationId?: string }) {
  const current = await requireRole(STAFF_ROLES);
  const scoped = await listScopedTransactions({
    from: range.from,
    to: range.to,
    locationId: current.isSuperAdmin ? range.locationId : undefined,
  });
  const summary = summarizeGiving(scoped.rows);
  const successful = scoped.rows.filter((row) => row.status === "SUCCESS");

  const byCurrency = bucketsFromRows(successful, (row) => String(row.currency)).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  const byDate = bucketsFromRows(successful, (row) => String(row.created_at).slice(0, 10)).sort((a, b) =>
    b.label.localeCompare(a.label),
  );
  const byMethod = bucketsFromRows(successful, (row) => String(row.payment_method)).sort(
    (a, b) => b.count - a.count,
  );

  const byTerminalId: Record<string, { count: number; totals: Record<string, number> }> = {};
  for (const row of successful) {
    const terminalId = (row.terminal_id as string | null) ?? null;
    if (!terminalId) {
      continue;
    }
    byTerminalId[terminalId] = byTerminalId[terminalId] ?? { count: 0, totals: {} };
    byTerminalId[terminalId].count += 1;
    incrementTotals(byTerminalId[terminalId].totals, String(row.currency), Number(row.amount));
  }

  const supabase = await createClient();
  let locationsQuery = supabase
    .from("locations")
    .select("id, name, code, members(count)")
    .eq("organization_id", current.organizationId)
    .order("name");
  if (scoped.locationId) {
    locationsQuery = locationsQuery.eq("id", scoped.locationId);
  }

  let terminalsQuery = supabase
    .from("payment_terminals")
    .select("id, terminal_code, device_name, status, last_seen_at, locations(name, code)")
    .eq("organization_id", current.organizationId)
    .order("terminal_code");
  if (scoped.locationId) {
    terminalsQuery = terminalsQuery.eq("location_id", scoped.locationId);
  }

  const [locations, terminals] = await Promise.all([locationsQuery, terminalsQuery]);
  if (locations.error) {
    logServerError("report.members", locations.error);
  }
  if (terminals.error) {
    logServerError("report.terminals", terminals.error);
  }

  const membersByLocation: MembersByLocationRow[] = (
    (locations.data ?? []) as Array<{
      id: string;
      name: string;
      code: string;
      members: { count: number }[] | null;
    }>
  ).map((location) => ({
    id: location.id,
    name: location.name,
    code: location.code,
    members: location.members?.[0]?.count ?? 0,
  }));

  const terminalActivity: TerminalActivityRow[] = (
    (terminals.data ?? []) as Array<{
      id: string;
      terminal_code: string;
      device_name: string;
      status: string;
      last_seen_at: string | null;
      locations: { name: string; code: string } | { name: string; code: string }[] | null;
    }>
  ).map((terminal) => {
    const location = Array.isArray(terminal.locations) ? terminal.locations[0] : terminal.locations;
    const activity = byTerminalId[terminal.id] ?? { count: 0, totals: {} };
    return {
      id: terminal.id,
      terminal_code: terminal.terminal_code,
      device_name: terminal.device_name,
      status: terminal.status,
      last_seen_at: terminal.last_seen_at,
      location_name: location ? `${location.name} (${location.code})` : "—",
      transaction_count: activity.count,
      totals: activity.totals,
    };
  });

  return {
    current,
    locationId: scoped.locationId,
    summary,
    byCurrency,
    byDate,
    byMethod,
    membersByLocation,
    terminalActivity,
  };
}
