import { LIST_PAGE_SIZE, searchPattern } from "@/lib/admin/list-page";
import { getAdminLocationSelection } from "@/lib/auth/admin-location";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/types";
import { listScopedTransactions, summarizeGiving } from "@/lib/services/giving.service";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/log-server-error";

export type DashboardRange = {
  from: string;
  to: string;
};

export function defaultDashboardRange(): DashboardRange {
  const year = new Date().getUTCFullYear();
  return {
    from: `${year}-01-01`,
    to: new Date().toISOString().slice(0, 10),
  };
}

export function parseDashboardRange(from?: string, to?: string): DashboardRange {
  const fallback = defaultDashboardRange();
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  return {
    from: from && datePattern.test(from) ? from : fallback.from,
    to: to && datePattern.test(to) ? to : fallback.to,
  };
}

export type DashboardFilters = {
  q?: string;
};

export async function getDashboardData(range: DashboardRange, filters: DashboardFilters = {}) {
  const current = await requireRole(STAFF_ROLES);
  const selection = await getAdminLocationSelection(current);
  const locationId = selection.locationId;
  const supabase = await createClient();
  const pattern = searchPattern(filters.q);

  let membersQuery = supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", current.organizationId);
  if (locationId) {
    membersQuery = membersQuery.eq("location_id", locationId);
  }

  let terminalsQuery = supabase
    .from("payment_terminals")
    .select("id, status")
    .eq("organization_id", current.organizationId);
  if (locationId) {
    terminalsQuery = terminalsQuery.eq("location_id", locationId);
  }

  let locationsQuery = supabase
    .from("locations")
    .select("id, name, code, status, members(count)")
    .eq("organization_id", current.organizationId)
    .order("name");
  if (locationId) {
    locationsQuery = locationsQuery.eq("id", locationId);
  }

  let recentMembersQuery = supabase
    .from("members")
    .select("id, first_name, last_name, membership_number, date_joined, locations(name, code)")
    .eq("organization_id", current.organizationId)
    .order("created_at", { ascending: false })
    .limit(LIST_PAGE_SIZE);
  if (locationId) {
    recentMembersQuery = recentMembersQuery.eq("location_id", locationId);
  }
  if (pattern) {
    recentMembersQuery = recentMembersQuery.or(
      `first_name.ilike.${pattern},last_name.ilike.${pattern},membership_number.ilike.${pattern}`,
    );
  }

  let recentGivingQuery = supabase
    .from("giving_transactions")
    .select(
      "id, amount, currency, payment_method, status, transaction_reference, created_at, members(first_name, last_name, membership_number), giving_categories(name)",
    )
    .eq("organization_id", current.organizationId)
    .order("created_at", { ascending: false })
    .limit(pattern ? 40 : LIST_PAGE_SIZE);
  if (locationId) {
    recentGivingQuery = recentGivingQuery.eq("location_id", locationId);
  }

  const [members, terminals, locations, recentMembers, recentGiving, scoped] =
    await Promise.all([
      membersQuery,
      terminalsQuery,
      locationsQuery,
      recentMembersQuery,
      recentGivingQuery,
      listScopedTransactions({ ...range, locationId: locationId ?? "" }),
    ]);

  if (members.error) logServerError("dashboard.members", members.error);
  if (terminals.error) logServerError("dashboard.terminals", terminals.error);
  if (locations.error) logServerError("dashboard.locations", locations.error);
  if (recentMembers.error) logServerError("dashboard.recentMembers", recentMembers.error);
  if (recentGiving.error) logServerError("dashboard.recentGiving", recentGiving.error);

  const summary = summarizeGiving(scoped.rows);
  const activeLocations = ((locations.data ?? []) as Array<{ status: string }>).filter(
    (location) => location.status === "ACTIVE",
  ).length;
  const onlineTerminals = ((terminals.data ?? []) as Array<{ status: string }>).filter(
    (terminal) => terminal.status === "ONLINE",
  ).length;

  const membersByLocation = ((locations.data ?? []) as Array<{
    name: string;
    code: string;
    members: { count: number }[] | null;
  }>).map((location) => ({
    name: `${location.name} (${location.code})`,
    members: location.members?.[0]?.count ?? 0,
  }));

  return {
    current,
    selection,
    range,
    memberCount: members.count ?? 0,
    activeLocations,
    onlineTerminals,
    terminalCount: ((terminals.data ?? []) as unknown[]).length,
    summary,
    membersByLocation,
    recentMembers: ((recentMembers.data ?? []) as Array<Record<string, unknown>>).map((member) => {
      const location = member.locations as
        | { name: string; code: string }
        | { name: string; code: string }[]
        | null;
      const locationRow = Array.isArray(location) ? location[0] : location;
      return {
        id: String(member.id),
        name:
          [member.first_name, member.last_name].filter(Boolean).join(" ").trim() ||
          String(member.membership_number),
        membership_number: String(member.membership_number),
        date_joined: String(member.date_joined),
        location_name: locationRow ? `${locationRow.name} (${locationRow.code})` : "—",
      };
    }),
    recentGiving: ((recentGiving.data ?? []) as Array<Record<string, unknown>>)
      .map((row) => {
        const member = row.members as
          | { first_name: string | null; last_name: string | null; membership_number: string }
          | { first_name: string | null; last_name: string | null; membership_number: string }[]
          | null;
        const category = row.giving_categories as { name: string } | { name: string }[] | null;
        const memberRow = Array.isArray(member) ? member[0] : member;
        return {
          id: String(row.id),
          amount: Number(row.amount),
          currency: String(row.currency),
          status: String(row.status),
          payment_method: String(row.payment_method),
          transaction_reference: String(row.transaction_reference),
          created_at: String(row.created_at),
          member_name: memberRow
            ? [memberRow.first_name, memberRow.last_name].filter(Boolean).join(" ").trim() ||
              memberRow.membership_number
            : "Anonymous",
          category_name: Array.isArray(category) ? category[0]?.name ?? "Giving" : category?.name ?? "Giving",
        };
      })
      .filter((row) => {
        if (!pattern) {
          return true;
        }
        const haystack = `${row.member_name} ${row.category_name} ${row.transaction_reference}`.toLowerCase();
        return haystack.includes(filters.q!.trim().toLowerCase());
      })
      .slice(0, LIST_PAGE_SIZE),
  };
}
