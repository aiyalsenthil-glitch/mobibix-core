import React from 'react';

interface CurrencyTextProps {
  /** Amount in PAISE (integer) or RUPEES (float) */
  amount: number;
  /** Set to true if input is in paise (default: true) */
  isPaise?: boolean;
  /** CSS class name */
  className?: string;
  /** Whether to show the currency symbol (default: true) */
  showSymbol?: boolean;
  /** Number of decimal places (default: 2) */
  decimals?: number;
}

/**
 * Enterprise-grade Currency Display Component
 * Enforces Indian Numbering System (en-IN) and consistent ₹ symbol placement.
 * Handles negative values as -₹200.00
 */
export const CurrencyText: React.FC<CurrencyTextProps> = ({
  amount,
  isPaise = true,
  className = "",
  showSymbol = true,
  decimals = 2,
}) => {
  // Convert to Rupees if needed
  const valueInRupees = isPaise ? amount / 100 : amount;

  // Format using en-IN
  const formatted = new Intl.NumberFormat('en-IN', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(valueInRupees));

  const isNegative = valueInRupees < 0;

  return (
    <span className={className}>
      {isNegative ? '-' : ''}
      {formatted}
    </span>
  );
};
