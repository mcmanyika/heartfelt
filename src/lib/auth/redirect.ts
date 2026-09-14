import { getHomePath } from "@/lib/auth/permissions";
import { safeInternalPath } from "@/lib/utils/safe-redirect";
import type { CurrentUser } from "@/lib/auth/types";

export function resolvePostLoginPath(
  user: Pick<CurrentUser, "roleNames">,
  next?: string | null,
) {
  const home = getHomePath(user);
  const safeNext = safeInternalPath(next);

  if (!safeNext) {
    return home;
  }

  if (safeNext.startsWith("/admin") && home !== "/admin/dashboard") {
    return home;
  }

  if (safeNext.startsWith("/member") && home !== "/member/dashboard") {
    return home;
  }

  return safeNext;
}
