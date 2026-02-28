import { BadRequestException } from '@nestjs/common';

/**
 * Indian GSTIN format validator.
 *
 * Format: {2-digit state code}{10-char PAN}{entity code}{check digit}{Z}{checksum}
 * Example: 33ABCDE1234F1Z5
 *
 * Used by BillingService (createInvoice) and SalesService (updateInvoice).
 * Centralised here to prevent regex drift between callers.
 */
export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Returns true if the GSTIN string matches the 15-character GSTN format.
 */
export function isValidGstin(gstin: string): boolean {
  return GSTIN_REGEX.test(gstin);
}

/**
 * Throws a BadRequestException if the GSTIN format is invalid.
 *
 * @param gstin  - The GSTIN string to validate
 * @param label  - Human-readable label for the error message (e.g. "Shop GSTIN", "Customer GSTIN")
 */
export function assertGstinFormat(gstin: string, label = 'GSTIN'): void {
  if (!GSTIN_REGEX.test(gstin)) {
    throw new BadRequestException(
      `${label} "${gstin}" is in an invalid format. ` +
        'GST Registration Number must be 15 characters (e.g. 33ABCDE1234F1Z5).',
    );
  }
}
