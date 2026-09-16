import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { TENANT_HEADER, isValidTenantSlug } from "@/lib/tenant/config";
import { logServerError } from "@/lib/utils/log-server-error";

export type PublicTenant = {
  id: string;
  name: string;
  slug: string;
  short_code: string;
  logo_url: string | null;
};

export type TenantResolution =
  | { kind: "apex"; tenant: null; slug: null }
  | { kind: "missing"; tenant: null; slug: string }
  | { kind: "tenant"; tenant: PublicTenant; slug: string };

async function readTenantSlug() {
  const headerStore = await headers();
  const slug = headerStore.get(TENANT_HEADER)?.trim().toLowerCase() ?? "";
  return slug && isValidTenantSlug(slug) ? slug : null;
}

async function loadTenantBySlug(slug: string) {
  const aliases = slug === "heartfelt" ? ["heartfelt", "heartfelt-international-ministries"] : [slug];

  try {
    const admin = createAdminClient();
    const withCode = await admin
      .from("organizations")
      .select("id, name, slug, short_code, logo_url")
      .or(aliases.map((value) => `slug.eq.${value}`).join(","))
      .limit(1)
      .maybeSingle();

    const result = withCode.error?.message.toLowerCase().includes("short_code")
      ? await admin
          .from("organizations")
          .select("id, name, slug, logo_url")
          .or(aliases.map((value) => `slug.eq.${value}`).join(","))
          .limit(1)
          .maybeSingle()
      : withCode;

    if (result.error) {
      logServerError("tenant.lookup", result.error);
      return null;
    }

    if (!result.data) {
      return null;
    }

    const row = result.data as {
      id: string;
      name: string;
      slug: string;
      short_code?: string | null;
      logo_url: string | null;
    };

    return {
      id: row.id,
      name: row.name,
      slug: row.slug === "heartfelt-international-ministries" ? "heartfelt" : row.slug,
      short_code: (row.short_code ?? (row.slug.includes("heartfelt") ? "HIM" : "ORG")).toUpperCase(),
      logo_url: row.logo_url,
    } satisfies PublicTenant;
  } catch (error) {
    logServerError("tenant.lookup", error);
    return null;
  }
}

async function resolveTenantUncached(): Promise<TenantResolution> {
  const slug = await readTenantSlug();
  if (!slug) {
    return { kind: "apex", tenant: null, slug: null };
  }

  const tenant = await loadTenantBySlug(slug);
  if (!tenant) {
    return { kind: "missing", tenant: null, slug };
  }

  return { kind: "tenant", tenant, slug };
}

export const resolveTenant = cache(resolveTenantUncached);

export async function getTenant() {
  const resolution = await resolveTenant();
  return resolution.tenant;
}

export async function requireTenant() {
  const resolution = await resolveTenant();
  if (resolution.kind === "apex") {
    redirect("/login");
  }
  if (resolution.kind !== "tenant" || !resolution.tenant) {
    notFound();
  }
  return resolution.tenant;
}
