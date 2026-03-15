import { Injectable } from '@nestjs/common';
import { ITaxStrategy, TaxLineItem, TaxResult } from '../tax-strategy.interface';

/**
 * No-Tax Strategy — Default for unlisted/other countries
 *
 * Returns zero tax. Safe fallback for countries not yet configured.
 */
@Injectable()
export class NoTaxStrategy implements ITaxStrategy {
  readonly name = 'No Tax';
  readonly countryCode = 'XX';

  calculate(items: TaxLineItem[], currency: string): TaxResult {
    const taxableAmount = items.reduce((sum, i) => sum + i.amount, 0);
    return {
      taxableAmount,
      taxTotal: 0,
      grandTotal: taxableAmount,
      currency,
      taxDetails: {},
    };
  }

  hasTaxRegistrationNumber() {
    return false;
  }

  invoiceLabel() {
    return '';
  }
}
