import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/utils/log-server-error";

export const ORGANIZATION_LOGO_BUCKET = "organization-assets";
export const ORGANIZATION_LOGO_MAX_BYTES = 5 * 1024 * 1024;

export const ORGANIZATION_LOGO_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
} as const;

export type OrganizationLogoMime = keyof typeof ORGANIZATION_LOGO_TYPES;

export function organizationLogoPath(organizationId: string, extension: string) {
  return `${organizationId}/logo.${extension}`;
}

export function isOrganizationLogoFile(
  value: FormDataEntryValue | File | null,
): value is File {
  return Boolean(
    value &&
      typeof value === "object" &&
      "arrayBuffer" in value &&
      "size" in value &&
      "type" in value &&
      "name" in value,
  );
}

export function organizationLogoExtension(mimeType: string, fileName?: string) {
  const fromMime = ORGANIZATION_LOGO_TYPES[mimeType as OrganizationLogoMime];
  if (fromMime) {
    return fromMime;
  }

  const match = fileName?.toLowerCase().match(/\.(jpe?g|png|webp|svg)$/);
  if (!match) {
    return null;
  }

  return match[1] === "jpeg" ? "jpg" : match[1];
}

export async function resolveOrganizationLogoUrl(logoUrl: string | null | undefined) {
  if (!logoUrl) {
    return null;
  }
  if (/^https?:\/\//i.test(logoUrl)) {
    return logoUrl;
  }

  try {
    const admin = createAdminClient();
    const signed = await admin.storage
      .from(ORGANIZATION_LOGO_BUCKET)
      .createSignedUrl(logoUrl, 60 * 60 * 24);
    if (!signed.error && signed.data?.signedUrl) {
      return signed.data.signedUrl;
    }

    const { data } = admin.storage.from(ORGANIZATION_LOGO_BUCKET).getPublicUrl(logoUrl);
    return data.publicUrl;
  } catch (error) {
    logServerError("organization.logoUrl", error);
    return null;
  }
}
