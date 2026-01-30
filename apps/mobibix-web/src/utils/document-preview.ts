import type { YearFormat } from "@/types/document-settings";

/**
 * Generate preview document number (frontend-only, no backend call)
 * Mimics backend DocumentNumberService logic for preview purposes
 */
export function generatePreviewNumber(
  prefix: string,
  documentCode: string,
  separator: string,
  yearFormat: YearFormat,
  numberLength: number,
  sequenceNumber: number = 1, // Preview uses 1 or currentNumber + 1
): string {
  const parts: string[] = [prefix.toUpperCase(), documentCode.toUpperCase()];

  // Add year if applicable
  const yearString = formatYearForPreview(new Date(), yearFormat);
  if (yearString) {
    parts.push(yearString);
  }

  // Add padded sequence number
  const paddedNumber = sequenceNumber.toString().padStart(numberLength, "0");
  parts.push(paddedNumber);

  return parts.join(separator);
}

/**
 * Format year based on YearFormat enum
 * Mimics backend getFinancialYear() logic
 */
function formatYearForPreview(date: Date, format: YearFormat): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed

  // Calculate financial year (April to March)
  const startYear = month < 4 ? year - 1 : year;
  const endYear = startYear + 1;

  switch (format) {
    case "FY":
      // Financial year: 2526 (April 2025 - March 2026)
      return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;

    case "YYYY":
      // Full year: 20252026
      return `${startYear}${endYear}`;

    case "YY":
      // Ending year only: 26
      return String(endYear).slice(-2);

    case "NONE":
      // No year
      return "";

    default:
      return "";
  }
}
