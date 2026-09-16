export const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME?.trim() || "Heartfelt Connect";

export const TENANT_HEADER = "x-tenant-slug";

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

export function isLoopbackHost(value: string) {
  const { hostname } = splitHostPort(value);
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

export function getConfiguredRootDomain() {
  return process.env.ROOT_DOMAIN?.trim() || process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "";
}

export function getRootDomain() {
  return getConfiguredRootDomain() || "localhost:3000";
}

export function rootDomainForHost(hostHeader: string) {
  const configured = getConfiguredRootDomain();
  if (configured && !isLoopbackHost(configured)) {
    return configured;
  }

  const { hostname, port } = splitHostPort(hostHeader);
  if (hostname && !isLoopbackHost(hostname)) {
    const apex = hostname.replace(/^www\./, "");
    return port ? `${apex}:${port}` : apex;
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
  return `${originProtocolFor(rootDomain, forwardedProto)}://${rootDomain}`;
}

export function apexOrigin() {
  return originForRoot(getRootDomain());
}

export function tenantOriginForRoot(slug: string, rootDomain: string, forwardedProto?: string | null) {
  const root = splitHostPort(rootDomain);
  const host = root.port ? `${slug}.${root.hostname}:${root.port}` : `${slug}.${root.hostname}`;
  return `${originProtocolFor(rootDomain, forwardedProto)}://${host}`;
}

export function tenantOrigin(slug: string) {
  return tenantOriginForRoot(slug, getRootDomain());
}
