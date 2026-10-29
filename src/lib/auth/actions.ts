"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loadCurrentUser } from "@/lib/auth/get-current-user";
import { getHomePath } from "@/lib/auth/permissions";
import { resolvePostLoginPath } from "@/lib/auth/redirect";
import type { CurrentUser } from "@/lib/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/tenant/get-tenant";
import {
  loginSchema,
  mobileLoginRequestSchema,
  mobileLoginVerifySchema,
} from "@/lib/validators/auth.schema";
import type { Database } from "@/types/database.types";
import { firstZodError } from "@/lib/utils/forms";
import { logServerError } from "@/lib/utils/log-server-error";
import { normalizePhoneToE164, phoneDigits, phonesMatch } from "@/lib/utils/phone";

function loginErrorMessage(code?: string) {
  switch (code) {
    case "invalid_credentials":
    case "invalid_grant":
      return "Invalid email or password.";
    case "email_not_confirmed":
      return "This account has not been confirmed yet.";
    case "otp_expired":
      return "That code has expired. Request a new one.";
    case "otp_disabled":
      return "Mobile sign-in is not available right now.";
    default:
      return "Unable to sign in. Please try again.";
  }
}

function mobileOtpErrorMessage(code?: string, message?: string) {
  const normalized = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  if (normalized.includes("sms") || normalized.includes("twilio") || normalized.includes("provider")) {
    return "SMS delivery is not configured yet. Ask an administrator to enable mobile sign-in.";
  }
  if (code === "over_sms_send_rate_limit" || normalized.includes("rate")) {
    return "Please wait a moment before requesting another code.";
  }
  return loginErrorMessage(code);
}

async function writeLoginAudit(current: CurrentUser) {
  const supabase = await createClient();
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
}

async function completeAuthenticatedLogin(next?: string | null) {
  const supabase = await createClient();
  const current = await loadCurrentUser();

  if (!current) {
    await supabase.auth.signOut();
    return { error: "Your account is missing a profile. Contact an administrator." };
  }

  const tenant = await getTenant();
  if (!tenant) {
    await supabase.auth.signOut();
    return { error: "Sign in from your church address." };
  }
  if (tenant.id !== current.organizationId) {
    await supabase.auth.signOut();
    return { error: "This account belongs to a different church." };
  }

  if (current.profileStatus !== "ACTIVE") {
    await supabase.auth.signOut();
    return { error: "This account is waiting for an administrator to activate it." };
  }

  if (current.roleNames.length === 0) {
    await supabase.auth.signOut();
    return { error: "This account has no assigned role. Contact an administrator." };
  }

  await writeLoginAudit(current);
  redirect(resolvePostLoginPath(current, next));
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

  return completeAuthenticatedLogin(next);
}

async function findTenantProfileByPhone(organizationId: string, e164: string) {
  const admin = createAdminClient();
  const digits = phoneDigits(e164);
  const nationalTail = digits.slice(-9);

  const { data, error } = await admin
    .from("profiles")
    .select("id, phone, status")
    .eq("organization_id", organizationId)
    .not("phone", "is", null)
    .ilike("phone", `%${nationalTail}%`)
    .limit(25);

  if (error) {
    logServerError("login.mobile.lookup", error);
    return { error: "Unable to look up that mobile number." as const };
  }

  const matches = ((data ?? []) as Array<{ id: string; phone: string | null; status: string }>).filter(
    (row) => phonesMatch(row.phone, e164),
  );

  if (matches.length === 0) {
    return { error: "No account found for that mobile number at this church." as const };
  }
  if (matches.length > 1) {
    return {
      error: "More than one account uses that mobile number. Sign in with email instead." as const,
    };
  }

  return { profile: matches[0]! };
}

export async function requestMobileLoginOtpAction(input: unknown) {
  const parsed = mobileLoginRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const tenant = await getTenant();
  if (!tenant) {
    return { error: "Sign in from your church address." };
  }

  const e164 = normalizePhoneToE164(parsed.data.phone);
  if (!e164) {
    return { error: "Enter a valid mobile number with country code (e.g. +263771234567)." };
  }

  const found = await findTenantProfileByPhone(tenant.id, e164);
  if ("error" in found) {
    return { error: found.error };
  }

  if (found.profile.status !== "ACTIVE") {
    return { error: "This account is waiting for an administrator to activate it." };
  }

  const admin = createAdminClient();
  const { error: syncError } = await admin.auth.admin.updateUserById(found.profile.id, {
    phone: e164,
    phone_confirm: true,
  });

  if (syncError) {
    logServerError("login.mobile.syncPhone", syncError);
    const message = syncError.message.toLowerCase();
    if (message.includes("unique") || message.includes("already")) {
      return {
        error: "That mobile number is linked to another login. Sign in with email or contact your campus office.",
      };
    }
    return { error: "Unable to prepare mobile sign-in for that number." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: e164,
    options: { shouldCreateUser: false },
  });

  if (error) {
    logServerError("login.mobile.otp", error);
    return { error: mobileOtpErrorMessage(error.code, error.message) };
  }

  return { ok: true as const, phone: e164 };
}

export async function verifyMobileLoginOtpAction(input: unknown, next?: string | null) {
  const parsed = mobileLoginVerifySchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const e164 = normalizePhoneToE164(parsed.data.phone);
  if (!e164) {
    return { error: "Enter a valid mobile number with country code (e.g. +263771234567)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: e164,
    token: parsed.data.token,
    type: "sms",
  });

  if (error) {
    logServerError("login.mobile.verify", error);
    if (error.code === "otp_expired") {
      return { error: loginErrorMessage(error.code) };
    }
    return { error: "Invalid or expired code. Try again or request a new one." };
  }

  return completeAuthenticatedLogin(next);
}

export async function logoutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logServerError("logout", error);
  }

  redirect("/login");
}
