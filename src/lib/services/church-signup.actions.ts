"use server";

import { redirect } from "next/navigation";
import { createChurchOrganization } from "@/lib/services/church-signup.service";
import { resolveTenant } from "@/lib/tenant/get-tenant";

export async function createChurchAction(input: unknown) {
  const resolution = await resolveTenant();
  if (resolution.kind !== "apex") {
    return { error: "Create a church from the main site, not a campus address." };
  }

  const result = await createChurchOrganization(input);
  if (result.error) {
    return { error: result.error };
  }
  if (!result.redirectTo) {
    return { error: "Your church was created, but the sign-in address could not be built." };
  }

  redirect(result.redirectTo);
}
