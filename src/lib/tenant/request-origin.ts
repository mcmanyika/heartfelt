import "server-only";

import { headers } from "next/headers";
import {
  originForRoot,
  rootDomainForHost,
  tenantOriginForRoot,
} from "@/lib/tenant/config";

export async function getRequestHost() {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
}

export async function getRequestProto() {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-proto");
}

export async function getRequestRootDomain() {
  return rootDomainForHost(await getRequestHost());
}

export async function requestApexOrigin() {
  const host = await getRequestHost();
  return originForRoot(rootDomainForHost(host), await getRequestProto());
}

export async function requestTenantOrigin(slug: string) {
  const host = await getRequestHost();
  return tenantOriginForRoot(slug, rootDomainForHost(host), await getRequestProto());
}
