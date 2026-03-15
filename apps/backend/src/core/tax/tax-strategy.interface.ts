/**
 * Global Tax Engine - Strategy Interface
 *
 * Every country-specific strategy must implement this interface.
 * This ensures all tax engines return a standardized, API-compatible result.
 *
 * Phase 2 Strategy, not used in production yet.
 * Current invoices still use TaxCalculationService (India GST).
 */

export interface TaxLineItem {
  amount: number;      // Taxable amount in smallest currency unit (paise, fils, cents)
  taxRate?: number;    // Item-level override (optional)
}

export interface TaxResult {
  taxableAmount: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  /**
   * Localized tax breakdown stored as JSON in Invoice.taxDetails field.
   * Examples:
   *   India:     { cgst: 90, sgst: 90, igstRate: 0 }
   *   UAE:       { vat: 50, vatRate: 5 }
   *   Malaysia:  { sst: 30, sstRate: 6 }
   */
  taxDetails: Record<string, unknown>;
}

export interface ITaxStrategy {
  readonly name: string;
  readonly countryCode: string;

  /**
   * Calculate tax for a set of line items.
   * Amount is always in smallest currency unit.
   */
  calculate(items: TaxLineItem[], currency: string): TaxResult;

  /**
   * Whether this strategy supports a GST-style number (GSTIN, VAT No, etc.)
   */
  hasTaxRegistrationNumber(): boolean;

  /**
   * Label shown on invoices (e.g., "GST", "VAT", "SST")
   */
  invoiceLabel(): string;
}
