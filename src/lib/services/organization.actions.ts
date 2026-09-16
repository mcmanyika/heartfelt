"use server";

import { revalidatePath } from "next/cache";
import {
  removeOrganizationLogo,
  updateOrganization,
  uploadOrganizationLogo,
} from "@/lib/services/organization.service";

function revalidateOrganizationPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/audit");
  revalidatePath("/login");
  revalidatePath("/register");
  revalidatePath("/", "layout");
}

export async function updateOrganizationAction(input: unknown) {
  const result = await updateOrganization(input);
  if (result.error) {
    return { error: result.error };
  }

  revalidateOrganizationPaths();
  return { ok: true as const };
}

export async function uploadOrganizationLogoAction(formData: FormData) {
  const result = await uploadOrganizationLogo(formData.get("logo"));
  if (result.error) {
    return { error: result.error };
  }

  revalidateOrganizationPaths();
  return { ok: true as const };
}

export async function removeOrganizationLogoAction() {
  const result = await removeOrganizationLogo();
  if (result.error) {
    return { error: result.error };
  }

  revalidateOrganizationPaths();
  return { ok: true as const };
}
