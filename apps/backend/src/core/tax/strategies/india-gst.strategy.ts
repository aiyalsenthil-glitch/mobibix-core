import { Injectable } from '@nestjs/common';
import { ITaxStrategy, TaxLineItem, TaxResult } from '../tax-strategy.interface';

/**
 * India GST Strategy
 *
 * Handles:
 *  - CGST + SGST (intra-state, split equally at rate/2 each)
 *  - IGST (interstate, full rate)
 *
 * This is the Phase 1 default and wraps the existing calculation logic
 * so we do NOT break any current invoice behaviour.
 */
@Injectable()
export class IndiaGSTStrategy implements ITaxStrategy {
  readonly name = 'India GST';
  readonly countryCode = 'IN';

  private readonly VALID_RATES = [0, 5, 9, 12, 18, 28];

  calculate(items: TaxLineItem[], currency = 'INR'): TaxResult {
    let taxableAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;

    for (const item of items) {
      const rate = item.taxRate ?? 18;
      const cgst = Math.round((item.amount * rate) / 200);
      const sgst = Math.round((item.amount * rate) / 200);
      taxableAmount += item.amount;
      totalCGST += cgst;
      totalSGST += sgst;
    }

    const taxTotal = totalCGST + totalSGST;

    return {
      taxableAmount,
      taxTotal,
      grandTotal: taxableAmount + taxTotal,
      currency,
      taxDetails: {
        cgst: totalCGST,
        sgst: totalSGST,
        igst: 0,
      },
    };
  }

  hasTaxRegistrationNumber() {
    return true; // GSTIN
  }

  invoiceLabel() {
    return 'GST';
  }
}
