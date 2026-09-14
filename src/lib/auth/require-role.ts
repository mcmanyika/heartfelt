import { redirect } from "next/navigation";
import { getHomePath, hasAnyRole } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/require-user";
import type { AppRole } from "@/types";
import type { CurrentUser } from "@/lib/auth/types";

export async function requireRole(
  allowed: AppRole | readonly AppRole[],
): Promise<CurrentUser> {
  const current = await requireUser();
  const roles = Array.isArray(allowed) ? allowed : [allowed];

  if (!hasAnyRole(current, roles)) {
    redirect(getHomePath(current));
  }

  return current;
}
