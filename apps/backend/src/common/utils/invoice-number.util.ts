/**
 * Utility functions for generating invoice/job card numbers with financial year
 * 
 * ⚠️ DEPRECATION NOTICE:
 * The hardcoded functions (generateSalesInvoiceNumber, etc.) are maintained for 
 * backward compatibility but should be replaced with DocumentNumberService.
 * 
 * New code should use:
 * ```ts
 * import { DocumentNumberService } from '../services/document-number.service';
 * const number = await documentNumberService.generateDocumentNumber(
 *   shopId,
 *   'SALES_INVOICE',
 *   new Date()
 * );
 * ```
 */

/**
 * Calculate financial year from a date
 * Financial year runs from April to March
 * e.g., April 2025 to March 2026 = 2526
 * 
 * This function is used by DocumentNumberService for year formatting.
 */
export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed, so add 1

  // If before April (month < 4), FY is previous year to current year
  // If April or later (month >= 4), FY is current year to next year
  if (month < 4) {
    const prevYear = year - 1;
    const prevYearShort = String(prevYear).slice(-2);
    const yearShort = String(year).slice(-2);
    return `${prevYearShort}${yearShort}`;
  } else {
    const nextYear = year + 1;
    const yearShort = String(year).slice(-2);
    const nextYearShort = String(nextYear).slice(-2);
    return `${yearShort}${nextYearShort}`;
  }
}

/**
 * @deprecated Use DocumentNumberService.generateDocumentNumber() instead.
 * 
 * Generate sales invoice number
 * Format: {prefix}-S-{financialYear}-{sequence}
 * Example: HP-S-2526-0001
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
 * @deprecated Use DocumentNumberService.generateDocumentNumber() instead.
 * 
 * Generate purchase invoice number
 * Format: {prefix}-P-{financialYear}-{sequence}
 * Example: HP-P-2526-0001
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
 * @deprecated Use DocumentNumberService.generateDocumentNumber() instead.
 * 
 * Generate job card number
 * Format: {prefix}-J-{financialYear}-{sequence}
 * Example: HP-J-2526-0001
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


