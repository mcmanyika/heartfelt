export const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME?.trim() || "Heartfelt Connect";

export const TENANT_HEADER = "x-tenant-slug";
export const TENANT_COOKIE = "hf_tenant";
export const TENANT_PATH_PREFIX = "c";

export const RESERVED_TENANT_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "start",
  "status",
  "support",
  "login",
  "register",
  "auth",
  "terminal",
  "member",
  "forbidden",
  "static",
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
const SHORT_CODE_PATTERN = /^[A-Z0-9]{2,8}$/;

export function normalizeRootDomain(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  let candidate = trimmed.split(",")[0]?.trim() ?? "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    try {
      candidate = new URL(candidate).host;
    } catch {
      candidate = candidate.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
    }
  }

  candidate = candidate.replace(/\/+$/, "").split("/")[0]?.trim() ?? "";
  const { hostname, port } = splitHostPort(candidate);
  if (!hostname) {
    return "";
  }

  const apex = hostname.replace(/^www\./, "");
  return port ? `${apex}:${port}` : apex;
}

export function isLoopbackHost(value: string) {
  const { hostname } = splitHostPort(normalizeRootDomain(value) || value);
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

export function getConfiguredRootDomain() {
  return (
    normalizeRootDomain(process.env.ROOT_DOMAIN ?? "") ||
    normalizeRootDomain(process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "")
  );
}

export function getRootDomain() {
  return getConfiguredRootDomain() || "localhost:3000";
}

export function rootDomainForHost(hostHeader: string) {
  const configured = getConfiguredRootDomain();
  if (configured && !isLoopbackHost(configured)) {
    return configured;
  }

  const fromRequest = normalizeRootDomain(hostHeader);
  if (fromRequest && !isLoopbackHost(fromRequest)) {
    return fromRequest;
  }

  return configured || "localhost:3000";
}

export function originProtocolFor(rootDomain: string, forwardedProto?: string | null) {
  const proto = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (proto === "http" || proto === "https") {
    return proto;
  }
  if (isLoopbackHost(rootDomain) || process.env.NODE_ENV !== "production") {
    return "http";
  }
  return "https";
}

export function isValidTenantSlug(slug: string) {
  return SLUG_PATTERN.test(slug) && !RESERVED_TENANT_SLUGS.has(slug);
}

export function isValidShortCode(code: string) {
  return SHORT_CODE_PATTERN.test(code);
}

export function supportsTenantSubdomains(rootDomain: string) {
  const { hostname } = splitHostPort(normalizeRootDomain(rootDomain) || rootDomain);
  if (!hostname) {
    return false;
  }
  if (isLoopbackHost(hostname)) {
    return true;
  }
  return !(
    hostname === "vercel.app" ||
    hostname.endsWith(".vercel.app") ||
    hostname.endsWith(".netlify.app") ||
    hostname.endsWith(".fly.dev")
  );
}

export function tenantPath(slug: string, pathname = "/") {
  const suffix = pathname === "/" ? "" : pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `/${TENANT_PATH_PREFIX}/${slug}${suffix}`;
}

export function tenantSlugFromPathname(pathname: string) {
  const match = pathname.match(new RegExp(`^/${TENANT_PATH_PREFIX}/([a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?)(?:/|$)`));
  const slug = match?.[1] ?? "";
  return isValidTenantSlug(slug) ? slug : null;
}

export function stripTenantPath(pathname: string, slug: string) {
  const prefix = `/${TENANT_PATH_PREFIX}/${slug}`;
  if (pathname === prefix) {
    return "/";
  }
  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length) || "/";
  }
  return pathname;
}

export function splitHostPort(host: string) {
  const trimmed = host.trim().toLowerCase().split(",")[0]?.trim() ?? "";
  if (!trimmed) {
    return { hostname: "", port: null as string | null };
  }

  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return {
      hostname: trimmed.slice(1, Math.max(end, 1)),
      port: trimmed.slice(end + 1).startsWith(":") ? trimmed.slice(end + 2) : null,
    };
  }

  const lastColon = trimmed.lastIndexOf(":");
  if (lastColon > -1 && trimmed.includes(".") === false && /^\d+$/.test(trimmed.slice(lastColon + 1))) {
    return { hostname: trimmed.slice(0, lastColon), port: trimmed.slice(lastColon + 1) };
  }

  if (lastColon > -1 && /^\d+$/.test(trimmed.slice(lastColon + 1))) {
    return { hostname: trimmed.slice(0, lastColon), port: trimmed.slice(lastColon + 1) };
  }

  return { hostname: trimmed, port: null as string | null };
}

export function tenantSlugFromHost(hostHeader: string, rootDomain = getRootDomain()) {
  const { hostname } = splitHostPort(hostHeader);
  const root = splitHostPort(rootDomain);
  if (!hostname || !root.hostname) {
    return null;
  }

  if (hostname === root.hostname || hostname === `www.${root.hostname}` || hostname === "127.0.0.1" || hostname === "::1") {
    return null;
  }

  const suffix = `.${root.hostname}`;
  if (!hostname.endsWith(suffix)) {
    return null;
  }

  const slug = hostname.slice(0, -suffix.length);
  if (!slug || slug.includes(".") || RESERVED_TENANT_SLUGS.has(slug)) {
    return null;
  }

  return isValidTenantSlug(slug) ? slug : null;
}

export function originProtocol() {
  return originProtocolFor(getRootDomain());
}

export function originForRoot(rootDomain: string, forwardedProto?: string | null) {
  const root = normalizeRootDomain(rootDomain) || rootDomain;
  return `${originProtocolFor(root, forwardedProto)}://${root}`;
}

export function apexOrigin() {
  return originForRoot(getRootDomain());
}

export function tenantOriginForRoot(slug: string, rootDomain: string, forwardedProto?: string | null) {
  const normalized = normalizeRootDomain(rootDomain) || rootDomain;
  const apex = originForRoot(normalized, forwardedProto);
  if (!supportsTenantSubdomains(normalized)) {
    return `${apex}${tenantPath(slug)}`;
  }

  const root = splitHostPort(normalized);
  const host = root.port ? `${slug}.${root.hostname}:${root.port}` : `${slug}.${root.hostname}`;
  return `${originProtocolFor(normalized, forwardedProto)}://${host}`;
}

export function tenantOrigin(slug: string) {
  return tenantOriginForRoot(slug, getRootDomain());
}
