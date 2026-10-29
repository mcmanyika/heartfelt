"use server";

import { captureReferralCode } from "@/lib/services/affiliate.service";

export async function captureReferralAction(code: string) {
  return captureReferralCode(code);
}
