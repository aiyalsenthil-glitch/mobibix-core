import { Injectable } from '@nestjs/common';
import { ITaxStrategy, TaxLineItem, TaxResult } from '../tax-strategy.interface';

/**
 * VAT Strategy — UAE (5%), Singapore GST, Malaysia SST
 *
 * A single, flat-rate VAT strategy parameterized by rate and currency.
 * Used for UAE (AED, 5%), Singapore (SGD, 9%), Malaysia (SST, MYR, 8%).
 */
@Injectable()
export class VATStrategy implements ITaxStrategy {
  readonly name: string;
  readonly countryCode: string;
  private readonly rate: number;

  constructor(countryCode: string, name: string, rate: number) {
    this.countryCode = countryCode;
    this.name = name;
    this.rate = rate;
  }

  calculate(items: TaxLineItem[], currency: string): TaxResult {
    let taxableAmount = 0;
    let vatAmount = 0;

    for (const item of items) {
      const effectiveRate = item.taxRate ?? this.rate;
      const vat = Math.round((item.amount * effectiveRate) / 100);
      taxableAmount += item.amount;
      vatAmount += vat;
    }

    return {
      taxableAmount,
      taxTotal: vatAmount,
      grandTotal: taxableAmount + vatAmount,
      currency,
      taxDetails: {
        vat: vatAmount,
        vatRate: this.rate,
      },
    };
  }

  hasTaxRegistrationNumber() {
    return true; // TRN / GST Reg No.
  }

  invoiceLabel() {
    return 'VAT';
  }
}
