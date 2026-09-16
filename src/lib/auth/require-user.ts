import { redirect } from "next/navigation";
import { getCurrentUser, loadCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/tenant/get-tenant";
import type { CurrentUser } from "@/lib/auth/types";

type RequireUserOptions = {
  fresh?: boolean;
};

export async function requireUser(
  options: RequireUserOptions = {},
): Promise<CurrentUser> {
  const current = options.fresh ? await loadCurrentUser() : await getCurrentUser();

  if (!current) {
    redirect("/login");
  }

  const tenant = await getTenant();
  if (tenant && tenant.id !== current.organizationId) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?reason=wrong-church");
  }

  if (current.profileStatus !== "ACTIVE") {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?reason=inactive");
  }

  return current;
}
