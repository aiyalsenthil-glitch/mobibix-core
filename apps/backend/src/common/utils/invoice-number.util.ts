/**
 * Utility functions for generating invoice/job card numbers with financial year
 */

/**
 * Calculate financial year from a date
 * Financial year runs from April to March
 * e.g., April 2025 to March 2026 = 202526
 */
export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed, so add 1

  // If before April (month < 4), FY is previous year to current year
  // If April or later (month >= 4), FY is current year to next year
  if (month < 4) {
    const prevYear = year - 1;
    return `${prevYear}${year}`;
  } else {
    const nextYear = year + 1;
    return `${year}${nextYear}`;
  }
}

/**
 * Generate sales invoice number
 * Format: {prefix}-S-{financialYear}-{sequence}
 * Example: HP-S-202526-0001
 */
export function generateSalesInvoiceNumber(
  prefix: string,
  sequence: number,
  date: Date = new Date(),
): string {
  const fy = getFinancialYear(date);
  const seqStr = String(sequence).padStart(4, '0');
  return `${prefix}-S-${fy}-${seqStr}`;
}

/**
 * Generate purchase invoice number
 * Format: {prefix}-P-{financialYear}-{sequence}
 * Example: HP-P-202526-0001
 */
export function generatePurchaseInvoiceNumber(
  prefix: string,
  sequence: number,
  date: Date = new Date(),
): string {
  const fy = getFinancialYear(date);
  const seqStr = String(sequence).padStart(4, '0');
  return `${prefix}-P-${fy}-${seqStr}`;
}

/**
 * Generate job card number
 * Format: {prefix}-J-{financialYear}-{sequence}
 * Example: HP-J-202526-0001
 */
export function generateJobCardNumber(
  prefix: string,
  sequence: number,
  date: Date = new Date(),
): string {
  const fy = getFinancialYear(date);
  const seqStr = String(sequence).padStart(4, '0');
  return `${prefix}-J-${fy}-${seqStr}`;
}
