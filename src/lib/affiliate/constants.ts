/** Full setup-fee commission when an org slug/code is used (basis points). */
export const AFFILIATE_COMMISSION_RATE_BPS = 2000;

/** Split share when a personal profile code is used (10% each to person + church). */
export const AFFILIATE_SPLIT_RATE_BPS = 1000;

export const AFFILIATE_REFERRAL_COOKIE = "hf_referral";

/** Cookie lifetime: 30 days. */
export const AFFILIATE_REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function affiliateCommissionCents(setupCents: number, rateBps = AFFILIATE_COMMISSION_RATE_BPS) {
  if (setupCents <= 0) {
    return 0;
  }
  return Math.round((setupCents * rateBps) / 10_000);
}
