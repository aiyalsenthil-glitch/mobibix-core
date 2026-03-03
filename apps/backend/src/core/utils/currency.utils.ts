/**
 * Core Currency Utility for MobiBix & GymPilot
 * Handles conversion between Paisa (Integer) and Rupees (Decimal)
 * and formats values for Indian Rupee (₹) display.
 */

/**
 * Convert Paisa (Int) to Rupees (Float/Decimal)
 * @param paise Amount in paise (e.g., 10050)
 * @returns Amount in rupees (e.g., 100.50)
 */
export function paiseToRupees(paise: number | bigint): number {
  return Number(paise) / 100;
}

/**
 * Convert Rupees (Float/Decimal) to Paisa (Int)
 * Uses rounding to prevent floating point issues (e.g., 19.99 * 100 = 1998.9999999999998)
 * @param rupees Amount in rupees (e.g., 100.50)
 * @returns Amount in paise (e.g., 10050)
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Format a numeric value as Indian Rupee (₹) string
 * Uses en-IN locale for Indian numbering system (Lakhs, Crores)
 * 
 * @param amount Amount in RUPEES (not paise)
 * @param options Intl.NumberFormatOptions
 * @returns Formatted string (e.g., ₹1,00,000.00)
 */
export function formatAsINR(amount: number, options: Intl.NumberFormatOptions = {}): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  };

  const formatter = new Intl.NumberFormat('en-IN', defaultOptions);
  
  // Custom handling for negative numbers to ensure format is -₹200.00 not ₹-200.00
  // Note: Intl.NumberFormat with style: 'currency' usually puts the sign correctly
  // but we enforce consistency here if needed.
  return formatter.format(amount);
}

/**
 * Calculate GST based on taxable amount and rate
 * @param taxableAmount Amount in PAISE
 * @param gstRate Rate in percentage (e.g., 18)
 * @returns GST amount in PAISE (rounded)
 */
export function calculateGST(taxableAmount: number, gstRate: number): number {
  return Math.round((taxableAmount * gstRate) / 100);
}

/**
 * Safe numeric conversion to prevent NaN
 * @param val Any value
 * @returns Number or 0
 */
export function safeNumber(val: any): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}
