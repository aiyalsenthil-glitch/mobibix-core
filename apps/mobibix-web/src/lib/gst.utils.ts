/**
 * GST Calculation Utilities for Indian GST compliance
 * Handles CGST, SGST, IGST calculations based on state
 */

export const VALID_GST_RATES = [0, 5, 9, 12, 18, 28];

export interface GSTCalculation {
  taxableAmount: number;
  gstRate: number;
  cgstRate: number; // For intra-state = gstRate / 2
  sgstRate: number; // For intra-state = gstRate / 2
  igstRate: number; // For inter-state = gstRate
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGST: number;
  totalAmount: number;
}

/**
 * Check if two states are the same (for CGST/SGST vs IGST)
 * Used to determine if transaction is intra-state or inter-state
 */
export function isIntraState(
  sellerState: string | undefined,
  buyerState: string | undefined,
): boolean {
  if (!sellerState || !buyerState) return true; // Default to intra-state
  return sellerState.toLowerCase() === buyerState.toLowerCase();
}

/**
 * Calculate GST amounts based on taxable amount and GST rate
 * Handles both intra-state (CGST + SGST) and inter-state (IGST)
 *
 * @param taxableAmount - The amount on which GST is calculated
 * @param gstRate - GST rate (0, 5, 9, 12, 18, 28)
 * @param isIntraState - true for CGST+SGST, false for IGST
 * @returns Calculation details with all GST components
 */
export function calculateGST(
  taxableAmount: number,
  gstRate: number,
  isIntraState: boolean = true,
): GSTCalculation {
  // Validate inputs
  if (taxableAmount < 0) throw new Error("Taxable amount cannot be negative");
  if (!VALID_GST_RATES.includes(gstRate)) {
    throw new Error(
      `Invalid GST rate: ${gstRate}. Valid rates: ${VALID_GST_RATES.join(", ")}`,
    );
  }

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isIntraState) {
    // Intra-state: split GST into CGST (50%) and SGST (50%)
    const halfRate = gstRate / 2;
    cgstAmount = Math.round((taxableAmount * halfRate) / 100);
    sgstAmount = Math.round((taxableAmount * halfRate) / 100);
  } else {
    // Inter-state: full GST as IGST
    igstAmount = Math.round((taxableAmount * gstRate) / 100);
  }

  const totalGST = cgstAmount + sgstAmount + igstAmount;
  const totalAmount = taxableAmount + totalGST;

  return {
    taxableAmount,
    gstRate,
    cgstRate: isIntraState ? gstRate / 2 : 0,
    sgstRate: isIntraState ? gstRate / 2 : 0,
    igstRate: isIntraState ? 0 : gstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalGST,
    totalAmount,
  };
}

/**
 * Calculate line-total GST for an invoice item
 */
export function calculateLineGST(
  quantity: number,
  rate: number,
  gstRate: number,
  isIntraState: boolean = true,
): GSTCalculation {
  const taxableAmount = quantity * rate;
  return calculateGST(taxableAmount, gstRate, isIntraState);
}

/**
 * Calculate invoice totals with GST breakdown
 */
export interface InvoiceTotals {
  subtotal: number; // Sum of all item taxable amounts
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalGST: number;
  grandTotal: number;
}

export function calculateInvoiceTotals(
  items: Array<{
    quantity: number;
    rate: number;
    gstRate: number;
    isIntraState: boolean;
  }>,
): InvoiceTotals {
  let subtotal = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  for (const item of items) {
    const calculation = calculateLineGST(
      item.quantity,
      item.rate,
      item.gstRate,
      item.isIntraState,
    );

    subtotal += calculation.taxableAmount;
    totalCGST += calculation.cgstAmount;
    totalSGST += calculation.sgstAmount;
    totalIGST += calculation.igstAmount;
  }

  const totalGST = totalCGST + totalSGST + totalIGST;
  const grandTotal = subtotal + totalGST;

  return {
    subtotal,
    totalCGST,
    totalSGST,
    totalIGST,
    totalGST,
    grandTotal,
  };
}

/**
 * Format currency for display (Indian format: ₹)
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Validate GST Number format (15 digits)
 * Format: AAPCU5055K1Z5 (state code + PAN + entity type + registration)
 */
export function isValidGSTIN(gstin: string): boolean {
  // Remove spaces and convert to uppercase
  const cleanGSTIN = gstin.replace(/\s/g, "").toUpperCase();

  // GSTIN must be 15 characters alphanumeric
  if (!/^[0-9A-Z]{15}$/.test(cleanGSTIN)) {
    return false;
  }

  return true;
}
