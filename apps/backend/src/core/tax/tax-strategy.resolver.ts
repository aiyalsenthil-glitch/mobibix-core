import { Injectable } from '@nestjs/common';
import { ITaxStrategy } from './tax-strategy.interface';
import { IndiaGSTStrategy } from './strategies/india-gst.strategy';
import { VATStrategy } from './strategies/vat.strategy';
import { NoTaxStrategy } from './strategies/no-tax.strategy';

/**
 * TaxStrategyResolver
 *
 * Determines the correct tax strategy based on the tenant's country.
 * This is the single authoritative source for "which tax rules apply here?".
 *
 * BACKWARD COMPATIBILITY:
 *  - Existing Indian tenants will always get IndiaGSTStrategy.
 *  - New international tenants get the matching strategy.
 *  - Unknown countries get NoTaxStrategy (zero tax, safe default).
 *
 * Phase 2: Will be replaced by DB-driven rules from the TaxRule table.
 */
@Injectable()
export class TaxStrategyResolver {
  private readonly strategies: Map<string, ITaxStrategy>;

  constructor() {
    this.strategies = new Map<string, ITaxStrategy>([
      ['IN',  new IndiaGSTStrategy()],
      ['AE',  new VATStrategy('AE', 'UAE VAT', 5)],
      ['SG',  new VATStrategy('SG', 'Singapore GST', 9)],
      ['MY',  new VATStrategy('MY', 'Malaysia SST', 8)],
      ['CA',  new NoTaxStrategy()],   // Phase 3: HST/GST/PST
      ['US',  new NoTaxStrategy()],   // Phase 3: state sales tax
    ]);
  }

  /**
   * Returns the strategy for a given ISO 2-letter country code.
   * Defaults to India GST so existing flows are NEVER broken.
   */
  getStrategy(countryCode?: string | null): ITaxStrategy {
    if (!countryCode) return this.strategies.get('IN')!;
    return this.strategies.get(countryCode.toUpperCase()) ?? new NoTaxStrategy();
  }
}
