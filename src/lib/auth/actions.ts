"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loadCurrentUser } from "@/lib/auth/get-current-user";
import { getHomePath } from "@/lib/auth/permissions";
import { resolvePostLoginPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators/auth.schema";
import type { Database } from "@/types/database.types";
import { logServerError } from "@/lib/utils/log-server-error";

function loginErrorMessage(code?: string) {
  switch (code) {
    case "invalid_credentials":
    case "invalid_grant":
      return "Invalid email or password.";
    case "email_not_confirmed":
      return "This account has not been confirmed yet.";
    default:
      return "Unable to sign in. Please try again.";
  }
}

export async function loginAction(input: unknown, next?: string | null) {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    logServerError("login", error);
    return { error: loginErrorMessage(error.code) };
  }

  const current = await loadCurrentUser();

  if (!current) {
    await supabase.auth.signOut();
    return { error: "Your account is missing a profile. Contact an administrator." };
  }

  if (current.profileStatus !== "ACTIVE") {
    await supabase.auth.signOut();
    return { error: "This account is inactive. Contact an administrator." };
  }

  if (current.roleNames.length === 0) {
    await supabase.auth.signOut();
    return { error: "This account has no assigned role. Contact an administrator." };
  }

  const requestHeaders = await headers();
  const ipAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip");

  const auditArgs: Database["public"]["Functions"]["write_audit_log"]["Args"] = {
    p_action: "USER_LOGIN",
    p_entity_type: "auth",
    p_entity_id: current.id,
    p_metadata: { portal: getHomePath(current) },
    p_ip_address: ipAddress ?? undefined,
  };

  const { error: auditError } = await supabase.rpc(
    "write_audit_log",
    auditArgs as never,
  );

  if (auditError) {
    logServerError("login.audit", auditError);
  }

  redirect(resolvePostLoginPath(current, next));
}

export async function logoutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logServerError("logout", error);
  }

  redirect("/login");
}
