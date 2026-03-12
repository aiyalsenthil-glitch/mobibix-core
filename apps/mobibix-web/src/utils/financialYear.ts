/**
 * Financial Year Utilities for Indian Financial Year (April 1 - March 31)
 *
 * Examples:
 * - Feb 15, 2026 → "2025-26" (FY 2025-26)
 * - Apr 1, 2026 → "2026-27" (FY 2026-27)
 * - Mar 31, 2026 → "2025-26" (FY 2025-26)
 */

/**
 * Calculate Indian financial year from a date
 * @param date - Date to calculate financial year for (defaults to current date)
 * @returns Financial year in format "YYYY-YY" (e.g., "2025-26")
 */
export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed, so add 1

  // If before April (Jan-Mar), FY is previous year to current year
  if (month < 4) {
    const prevYear = year - 1;
    return `${prevYear}-${String(year).slice(-2)}`;
  } else {
    // April onwards, FY is current year to next year
    const nextYear = year + 1;
    return `${year}-${String(nextYear).slice(-2)}`;
  }
}

/**
 * Get short form financial year (e.g., "2526" for FY 2025-26)
 * Used in invoice numbers and document references
 * @param date - Date to calculate financial year for (defaults to current date)
 * @returns Financial year in format "YYYY" (e.g., "2526")
 */
export function getFinancialYearShort(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (month < 4) {
    const prevYear = year - 1;
    return `${String(prevYear).slice(-2)}${String(year).slice(-2)}`;
  } else {
    const nextYear = year + 1;
    return `${String(year).slice(-2)}${String(nextYear).slice(-2)}`;
  }
}

/**
 * Get financial year start date
 * @param date - Date to calculate financial year for (defaults to current date)
 * @returns Start date of the financial year (April 1st)
 */
export function getFinancialYearStart(date: Date = new Date()): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (month < 4) {
    // Before April - FY started previous year
    return new Date(year - 1, 3, 1); // Month 3 = April (0-indexed)
  } else {
    // April or later - FY started this year
    return new Date(year, 3, 1);
  }
}

/**
 * Get financial year end date
 * @param date - Date to calculate financial year for (defaults to current date)
 * @returns End date of the financial year (March 31st)
 */
export function getFinancialYearEnd(date: Date = new Date()): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (month < 4) {
    // Before April - FY ends this year
    return new Date(year, 2, 31); // Month 2 = March (0-indexed)
  } else {
    // April or later - FY ends next year
    return new Date(year + 1, 2, 31);
  }
}

