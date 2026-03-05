import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaxStrategyResolver } from './tax-strategy.resolver';
import { TaxLineItem, TaxResult } from './tax-strategy.interface';

/**
 * TaxEngineService
 *
 * High-level service used by Invoice, JobCard, and Billing services.
 * It looks up the tenant's ISO countryCode, resolves the right strategy,
 * and returns a standardized TaxResult stored in Invoice.taxDetails.
 *
 * BACKWARD COMPATIBILITY:
 *  - If tenant has no country, defaults to India GST (IN).
 *  - Supports legacy "India" string via resolveIsoCode() normalizer.
 *  - TaxCalculationService is NOT deleted; old code paths are unaffected.
 */
@Injectable()
export class TaxEngineService {
  private readonly logger = new Logger(TaxEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: TaxStrategyResolver,
  ) {}

  /**
   * Calculate tax for a given tenant (DB lookup for country + currency).
   * @param tenantId  Tenant whose country/currency settings are used.
   * @param items     Line items with amounts in smallest currency unit.
   */
  async calculateForTenant(
    tenantId: string,
    items: TaxLineItem[],
  ): Promise<TaxResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        country: true,
        currency: true,
        taxSystem: true,
      },
    });

    const isoCode  = this.resolveIsoCode(tenant?.country);
    const currency = tenant?.currency ?? 'INR';
    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);

    const strategy = this.resolver.getStrategy(isoCode);

    // ✅ Production-level structured logging for debugging
    this.logger.log(
      `[TaxEngine] ` +
      `tenant=${tenantId} | ` +
      `country=${tenant?.country ?? 'null'} | ` +
      `isoCode=${isoCode} | ` +
      `strategy=${strategy.name} | ` +
      `currency=${currency} | ` +
      `subtotal=${subtotal}`,
    );

    const result = strategy.calculate(items, currency);

    this.logger.log(
      `[TaxEngine] Result → ` +
      `taxTotal=${result.taxTotal} | ` +
      `grandTotal=${result.grandTotal} | ` +
      `taxDetails=${JSON.stringify(result.taxDetails)}`,
    );

    return result;
  }

  /**
   * Lightweight calculation — caller provides ISO code + currency directly.
   * No DB call. Useful inside loops or batch invoice generation.
   */
  calculateForCountry(
    countryCode: string,
    currency: string,
    items: TaxLineItem[],
  ): TaxResult {
    const isoCode  = this.resolveIsoCode(countryCode);
    const strategy = this.resolver.getStrategy(isoCode);
    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);

    this.logger.debug(
      `[TaxEngine] Direct | isoCode=${isoCode} | strategy=${strategy.name} | subtotal=${subtotal}`,
    );

    return strategy.calculate(items, currency);
  }

  /**
   * Returns the invoice label for a given country (e.g. "GST", "VAT", "SST").
   * Used by invoice template rendering.
   */
  getInvoiceLabel(countryCode?: string | null): string {
    return this.resolver.getStrategy(this.resolveIsoCode(countryCode)).invoiceLabel();
  }

  /**
   * Normalizes any country representation to a 2-letter ISO 3166-1 alpha-2 code.
   *
   * Handles all legacy strings stored before ISO migration:
   *   "India"                  → "IN"
   *   "United Arab Emirates"   → "AE"
   *   "IN"                     → "IN" (already ISO, returned as-is)
   *
   * @returns 2-letter uppercase ISO code. Defaults to "IN" if unknown.
   */
  resolveIsoCode(country?: string | null): string {
    if (!country) return 'IN';

    // Already a 2-letter ISO code — return directly (fast path)
    if (/^[A-Z]{2}$/i.test(country.trim())) {
      return country.trim().toUpperCase();
    }

    const nameToIso: Record<string, string> = {
      'india':                   'IN',
      'united arab emirates':    'AE',
      'uae':                     'AE',
      'canada':                  'CA',
      'singapore':               'SG',
      'malaysia':                'MY',
      'united states':           'US',
      'united states of america':'US',
      'us':                      'US',
      'usa':                     'US',
      'united kingdom':          'GB',
      'uk':                      'GB',
      'australia':               'AU',
    };

    return nameToIso[country.trim().toLowerCase()] ?? 'IN';
  }
}
