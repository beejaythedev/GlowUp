// Nigerian mobile numbers: 11 digits starting 0, then a network prefix
// starting 7/8/9, e.g. 0803 123 4521. Also accepts a +234/234 country code
// in place of the leading 0.
const NIGERIAN_MOBILE_PATTERN = /^0[789][01]\d{8}$/;

/** The canonical local "0XXXXXXXXXX" form, or null if not a valid Nigerian mobile number. */
export function normalizeNigerianPhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  const local = digits.startsWith("+234")
    ? `0${digits.slice(4)}`
    : digits.startsWith("234")
      ? `0${digits.slice(3)}`
      : digits;

  return NIGERIAN_MOBILE_PATTERN.test(local) ? local : null;
}

export function isValidNigerianPhone(input: string): boolean {
  return normalizeNigerianPhone(input) !== null;
}
