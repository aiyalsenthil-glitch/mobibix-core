export function isValidIndianGSTIN(gstin: string): boolean {
  if (!gstin) return false;

  const GSTIN_REGEX =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  return GSTIN_REGEX.test(gstin.toUpperCase());
}
