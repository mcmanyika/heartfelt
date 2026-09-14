import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/log-server-error";
import { safeInternalPath } from "@/lib/utils/safe-redirect";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeInternalPath(requestUrl.searchParams.get("next")) ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    logServerError("auth.callback", error);
  }

  return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
}
