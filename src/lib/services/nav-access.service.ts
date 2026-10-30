import "server-only";

import { redirect } from "next/navigation";
import {
  ADMIN_NAV_ITEMS,
  TOGGLEABLE_ADMIN_NAV_ITEMS,
  type AdminNavItem,
  type AdminNavKey,
  navKeyFromPathname,
} from "@/lib/auth/admin-nav";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/log-server-error";

export type OrgNavAccessRow = {
  key: AdminNavKey;
  label: string;
  section: string | null;
  enabled: boolean;
  platformOnly: boolean;
};

function isToggleableKey(key: string): key is AdminNavKey {
  return TOGGLEABLE_ADMIN_NAV_ITEMS.some((item) => item.key === key);
}

export async function getDisabledNavKeys(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_nav_links")
    .select("nav_key, enabled")
    .eq("organization_id", organizationId)
    .eq("enabled", false);

  if (error) {
    logServerError("navAccess.disabled", error);
    return { keys: [] as AdminNavKey[], error: "Unable to load menu access settings." };
  }

  const keys = ((data ?? []) as Array<{ nav_key: string }>)
    .map((row) => row.nav_key)
    .filter(isToggleableKey);

  return { keys };
}

export async function listOrgNavAccess() {
  const current = await requireUser();
  if (!isPlatformAdminEmail(current.email)) {
    return { rows: [] as OrgNavAccessRow[], error: "Only ProFaith platform admins can manage menu access." };
  }

  const disabled = await getDisabledNavKeys(current.organizationId);
  const disabledSet = new Set(disabled.keys);

  const rows: OrgNavAccessRow[] = TOGGLEABLE_ADMIN_NAV_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    section: item.section ?? null,
    enabled: !disabledSet.has(item.key),
    platformOnly: Boolean(item.platformOnly),
  }));

  return { rows, error: disabled.error ?? null };
}

export async function setOrgNavLinkEnabled(input: { navKey: string; enabled: boolean }) {
  const current = await requireUser();
  if (!isPlatformAdminEmail(current.email)) {
    return { error: "Only ProFaith platform admins can manage menu access." };
  }
  if (!isToggleableKey(input.navKey)) {
    return { error: "That menu link cannot be changed." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("organization_nav_links").upsert(
    {
      organization_id: current.organizationId,
      nav_key: input.navKey,
      enabled: input.enabled,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "organization_id,nav_key" },
  );

  if (error) {
    logServerError("navAccess.set", error);
    return { error: "Unable to update menu access. Apply migration 023 if you have not already." };
  }

  return { ok: true as const };
}

export function filterNavItemsByAccess(
  items: readonly AdminNavItem[],
  disabledKeys: readonly AdminNavKey[],
  options?: { bypass?: boolean },
) {
  if (options?.bypass) {
    return [...items];
  }
  const disabled = new Set(disabledKeys);
  return items.filter((item) => item.alwaysEnabled || !disabled.has(item.key));
}

export async function requireNavAccessForPathname(pathname: string) {
  const current = await requireUser();
  if (isPlatformAdminEmail(current.email)) {
    return current;
  }

  const key = navKeyFromPathname(pathname);
  if (!key) {
    return current;
  }

  const item = ADMIN_NAV_ITEMS.find((nav) => nav.key === key);
  if (!item || item.alwaysEnabled) {
    return current;
  }

  const disabled = await getDisabledNavKeys(current.organizationId);
  if (disabled.keys.includes(key)) {
    redirect("/admin/dashboard");
  }

  return current;
}
