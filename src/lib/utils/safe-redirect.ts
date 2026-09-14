const ALLOWED_PREFIXES = ["/admin", "/member", "/terminal"];

export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return null;
  }

  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
    return null;
  }

  return ALLOWED_PREFIXES.some((prefix) => value === prefix || value.startsWith(`${prefix}/`))
    ? value
    : null;
}
