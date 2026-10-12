export const PACKAGE_PLANS = ["QUARTERLY", "HALF_YEAR", "YEARLY"] as const;

export type PackagePlan = (typeof PACKAGE_PLANS)[number];

export const HEADQUARTERS_SETUP_CENTS = 125_000;

const PLAN_CENTS: Record<PackagePlan, number> = {
  QUARTERLY: 24_000,
  HALF_YEAR: 48_000,
  YEARLY: 76_800,
};

const PLAN_MONTHS: Record<PackagePlan, number> = {
  QUARTERLY: 3,
  HALF_YEAR: 6,
  YEARLY: 12,
};

export function packagePlanLabel(plan: PackagePlan) {
  switch (plan) {
    case "QUARTERLY":
      return "Quarterly";
    case "HALF_YEAR":
      return "Half-year";
    case "YEARLY":
      return "Yearly";
  }
}

export function packagePlanMonths(plan: PackagePlan) {
  return PLAN_MONTHS[plan];
}

export function volumeDiscountPercent(locationCount: number) {
  if (locationCount <= 10) {
    return 0;
  }
  if (locationCount <= 50) {
    return 5;
  }
  if (locationCount <= 100) {
    return 10;
  }
  if (locationCount <= 250) {
    return 15;
  }
  return null;
}

export function branchSetupCents(memberCount: number) {
  if (memberCount <= 100) {
    return 10_000;
  }
  if (memberCount <= 250) {
    return 25_000;
  }
  if (memberCount <= 500) {
    return 50_000;
  }
  return 75_000;
}

export function addUtcMonths(value: Date, months: number) {
  const next = new Date(value.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

export type PackageQuote = {
  plan: PackagePlan;
  locationCount: number;
  discountPercent: number;
  subscriptionCents: number;
  headquartersCents: number;
  branchSetupCents: number[];
  setupCents: number;
  totalCents: number;
  periodEnd: string;
};

export type BillingCheckoutQuote = {
  plan: PackagePlan;
  label: string;
  totalCents: number;
  detail: string;
};

export function quotePackage(input: {
  plan: PackagePlan;
  locationCount: number;
  newBranchMemberCounts: number[];
  includeHeadquarters: boolean;
  periodStart: Date;
}): PackageQuote | { error: string } {
  if (input.locationCount > 250) {
    return { error: "251 or more locations are priced by agreement. Contact support before paying." };
  }

  const discountPercent = volumeDiscountPercent(input.locationCount);
  if (discountPercent === null) {
    return { error: "251 or more locations are priced by agreement. Contact support before paying." };
  }

  const gross = PLAN_CENTS[input.plan] * input.locationCount;
  const subscriptionCents = Math.round((gross * (100 - discountPercent)) / 100);
  const headquartersCents = input.includeHeadquarters ? HEADQUARTERS_SETUP_CENTS : 0;
  const branchFees = input.newBranchMemberCounts.map((count) => branchSetupCents(count));
  const branchTotal = branchFees.reduce((sum, amount) => sum + amount, 0);
  const setupCents = headquartersCents + branchTotal;
  const periodEnd = addUtcMonths(input.periodStart, PLAN_MONTHS[input.plan]);

  return {
    plan: input.plan,
    locationCount: input.locationCount,
    discountPercent,
    subscriptionCents,
    headquartersCents,
    branchSetupCents: branchFees,
    setupCents,
    totalCents: subscriptionCents + setupCents,
    periodEnd: periodEnd.toISOString(),
  };
}
