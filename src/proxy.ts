import { NextResponse, type NextRequest } from "next/server";
import {
  TENANT_COOKIE,
  TENANT_HEADER,
  isValidTenantSlug,
  rootDomainForHost,
  stripTenantPath,
  tenantSlugFromHost,
  tenantSlugFromPathname,
} from "@/lib/tenant/config";

function cookieOptions(request: NextRequest) {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  };
}

function applyTenantCookie(response: NextResponse, request: NextRequest, slug: string | null) {
  if (slug) {
    response.cookies.set(TENANT_COOKIE, slug, cookieOptions(request));
  }
  return response;
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const root = rootDomainForHost(host);
  const url = request.nextUrl.clone();
  const hostSlug = tenantSlugFromHost(host, root);
  const pathSlug = tenantSlugFromPathname(url.pathname);
  const querySlug = url.searchParams.get("church");
  const cookieSlug = request.cookies.get(TENANT_COOKIE)?.value;
  const isApexOnly = url.pathname === "/start" || url.pathname.startsWith("/start/");

  if (url.searchParams.has("changeChurch")) {
    url.searchParams.delete("changeChurch");
    url.pathname = "/login";
    const response = NextResponse.redirect(url);
    response.cookies.delete(TENANT_COOKIE);
    return response;
  }

  const slug = [
    hostSlug,
    pathSlug,
    isValidTenantSlug(querySlug ?? "") ? querySlug : null,
    !isApexOnly && isValidTenantSlug(cookieSlug ?? "") ? cookieSlug : null,
  ].find((value): value is string => Boolean(value && isValidTenantSlug(value))) ?? null;

  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set(TENANT_HEADER, slug);
  } else {
    requestHeaders.delete(TENANT_HEADER);
  }

  if (pathSlug) {
    url.pathname = stripTenantPath(url.pathname, pathSlug);
    const response = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
    return applyTenantCookie(response, request, pathSlug);
  }

  if (querySlug && isValidTenantSlug(querySlug)) {
    url.searchParams.delete("church");
    const response = NextResponse.redirect(url);
    return applyTenantCookie(response, request, querySlug);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return applyTenantCookie(response, request, slug);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
