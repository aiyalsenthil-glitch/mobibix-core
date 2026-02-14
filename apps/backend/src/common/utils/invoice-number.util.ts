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

import { getFinancialYearShort } from './financial-year.util';

/**
 * Calculate financial year from a date (SHORT FORMAT for document numbering)
 * Financial year runs from April to March
 * e.g., April 2025 to March 2026 = 2526
 *
 * @deprecated Use getFinancialYearShort from './financial-year.util' instead.
 * This function is maintained for backward compatibility.
 */
export function getFinancialYear(date: Date = new Date()): string {
  return getFinancialYearShort(date);
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
