"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createGivingCategory,
  createGivingTransaction,
  searchMembersForGiving,
  updateGivingCategory,
} from "@/lib/services/giving.service";

export async function createGivingTransactionAction(input: unknown) {
  const result = await createGivingTransaction(input);
  if (result.error || !result.id) {
    return { error: result.error ?? "Unable to record that transaction." };
  }

  revalidatePath("/admin/transactions");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/reports");
  redirect(`/admin/transactions?q=${encodeURIComponent(result.transaction_reference ?? "")}`);
}

export async function createGivingCategoryAction(input: unknown) {
  const result = await createGivingCategory(input);
  if (result.error || !result.id) {
    return { error: result.error ?? "Unable to create the category." };
  }

  revalidatePath("/admin/giving/categories");
  redirect("/admin/giving/categories");
}

export async function updateGivingCategoryAction(categoryId: string, input: unknown) {
  const result = await updateGivingCategory(categoryId, input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/giving/categories");
  redirect("/admin/giving/categories");
}

export async function searchMembersForGivingAction(query: string, locationId?: string) {
  return searchMembersForGiving(query, locationId);
}
