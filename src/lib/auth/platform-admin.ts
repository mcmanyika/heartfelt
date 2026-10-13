import "server-only";

export function platformAdminEmails() {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 && platformAdminEmails().includes(normalized);
}
