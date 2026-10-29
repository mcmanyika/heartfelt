/** Default dialing code when a local number is entered without a country prefix. */
export const DEFAULT_PHONE_COUNTRY_CODE = "263";

/**
 * Normalize free-form phone input to E.164 (e.g. +263771000001).
 * Local numbers starting with 0 (or bare national digits) use {@link DEFAULT_PHONE_COUNTRY_CODE}.
 */
export function normalizePhoneToE164(
  input: string,
  defaultCountryCode = DEFAULT_PHONE_COUNTRY_CODE,
): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const hasPlus = trimmed.includes("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  let e164: string;
  if (hasPlus) {
    e164 = `+${digits}`;
  } else if (digits.startsWith("0") && digits.length >= 9) {
    e164 = `+${defaultCountryCode}${digits.slice(1)}`;
  } else if (digits.startsWith(defaultCountryCode) && digits.length > defaultCountryCode.length + 6) {
    e164 = `+${digits}`;
  } else if (digits.length >= 8 && digits.length <= 12) {
    e164 = `+${defaultCountryCode}${digits}`;
  } else {
    return null;
  }

  const national = e164.slice(1);
  if (national.length < 8 || national.length > 15) {
    return null;
  }

  return e164;
}

export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** True when two free-form numbers resolve to the same E.164 value. */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) {
    return false;
  }
  const left = normalizePhoneToE164(a) ?? phoneDigits(a);
  const right = normalizePhoneToE164(b) ?? phoneDigits(b);
  return Boolean(left && right && left === right);
}
