import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  calculateGST,
  paiseToRupees,
  rupeesToPaise,
} from '../../../core/utils/currency.utils';

/**
 * TaxCalculationService: GST Tax Calculation for Indian invoices
 *
 * Handles:
 * - GST rate validation (5%, 9%, 12%, 18%, 28%)
 * - CGST/SGST calculation (intra-state)
 * - IGST calculation (interstate)
 * - GSTIN format validation
 * - Invoice total aggregation
 */
@Injectable()
export class TaxCalculationService {
  private readonly logger = new Logger(TaxCalculationService.name);

  // Valid GST rates in India
  private readonly VALID_RATES = [0, 5, 9, 12, 18, 28];

  /**
   * Validate if rate is a valid GST rate
   */
  validateGSTRate(rate: number): void {
    if (!Number.isInteger(rate) || !this.VALID_RATES.includes(rate)) {
      throw new BadRequestException(
        `Invalid GST rate: ${rate}. Must be one of: ${this.VALID_RATES.join(', ')}`,
      );
    }
  }

  /**
   * Calculate state-level tax (CGST + SGST - intra-state supply)
   * CGST = amount * rate / 200
   * SGST = amount * rate / 200
   * Total = amount * rate / 100
   *
   * Example: Amount=1000, Rate=18%
   * CGST = 1000 * 18 / 200 = 90
   * SGST = 1000 * 18 / 200 = 90
   * Total Tax = 180
   * Gross = 1180
   */
  calculateStateTax(amount: number, gstRate: number) {
    this.validateGSTRate(gstRate);

    const totalGst = calculateGST(amount, gstRate);
    const cgst = Math.round(totalGst / 2);
    const sgst = Math.round(totalGst / 2);

    return {
      taxableAmount: amount,
      gstRate,
      cgst,
      sgst,
      igst: 0,
      totalTax: cgst + sgst,
      grossAmount: amount + cgst + sgst,
    };
  }

  /**
   * Calculate integrated tax (IGST - interstate/B2B supply)
   * IGST = amount * rate / 100
   *
   * Note: Phase-1 doesn't require interstate supplies, but method available for Phase-2
   */
  calculateInterstateTab(amount: number, gstRate: number) {
    this.validateGSTRate(gstRate);

    const igst = calculateGST(amount, gstRate);

    return {
      taxableAmount: amount,
      gstRate,
      cgst: 0,
      sgst: 0,
      igst,
      totalTax: igst,
      grossAmount: amount + igst,
    };
  }

  /**
   * Validate supplier GSTIN format
   * GSTIN: 15 characters = 2-digit state + 5-digit PAN + 5-digit unit + 1-digit checksum
   * Format: ^[A-Z0-9]{15}$
   */
  validateGSTIN(gstin: string): boolean {
    if (!gstin || gstin.length !== 15) return false;
    return /^[A-Z0-9]{15}$/.test(gstin);
  }

  /**
   * Calculate total tax across all items in an invoice
   * Used for invoice header totals
   */
  calculateInvoiceTotals(items: Array<{ amount: number; gstRate: number }>) {
    let totalAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTax = 0;

    for (const item of items) {
      const tax = this.calculateStateTax(item.amount, item.gstRate);
      totalAmount += item.amount;
      totalCGST += tax.cgst;
      totalSGST += tax.sgst;
      totalTax += tax.totalTax;
    }

    return {
      subtotal: totalAmount,
      cgst: totalCGST,
      sgst: totalSGST,
      totalTax,
      grandTotal: totalAmount + totalTax,
    };
  }

  /**
   * Format amount to paise (smallest currency unit)
   * 1 rupee = 100 paise
   */
  toPaise(rupees: number): number {
    return rupeesToPaise(rupees);
  }

  /**
   * Format paise back to rupees (for display)
   */
  toRupees(paise: number): number {
    return paiseToRupees(paise);
  }
}
