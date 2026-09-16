import { NextResponse, type NextRequest } from "next/server";
import { TENANT_HEADER, rootDomainForHost, tenantSlugFromHost } from "@/lib/tenant/config";

export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const slug = tenantSlugFromHost(host, rootDomainForHost(host));
  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set(TENANT_HEADER, slug);
  } else {
    requestHeaders.delete(TENANT_HEADER);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
