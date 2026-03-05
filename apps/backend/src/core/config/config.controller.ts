import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../auth/decorators/skip-subscription-check.decorator';

/**
 * GET /api/config/countries
 *
 * Public endpoint — no auth required.
 * Used by Web (Next.js) and Android at startup to populate the country
 * selector instead of hardcoding values in the frontend.
 *
 * Phase 2: Move to DB (CountryConfig table). For Phase 1 this is static.
 */

export interface CountryOption {
  code: string;        // ISO 3166-1 alpha-2 (e.g. "IN")
  name: string;        // Display name
  currency: string;    // ISO 4217 (e.g. "INR")
  currencySymbol: string;
  phonePrefix: string; // E.164 dialing prefix (e.g. "+91")
  taxSystem: string;   // "GST" | "VAT" | "SST" | "NONE"
  timezone: string;    // IANA timezone (e.g. "Asia/Kolkata")
  hasGstField: boolean;// Whether to show GST/Tax ID field in onboarding
}

export const COUNTRIES: CountryOption[] = [
  {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    phonePrefix: '+91',
    taxSystem: 'GST',
    timezone: 'Asia/Kolkata',
    hasGstField: true,
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'د.إ',
    phonePrefix: '+971',
    taxSystem: 'VAT',
    timezone: 'Asia/Dubai',
    hasGstField: false,
  },
  {
    code: 'SG',
    name: 'Singapore',
    currency: 'SGD',
    currencySymbol: 'S$',
    phonePrefix: '+65',
    taxSystem: 'GST',
    timezone: 'Asia/Singapore',
    hasGstField: false,
  },
  {
    code: 'MY',
    name: 'Malaysia',
    currency: 'MYR',
    currencySymbol: 'RM',
    phonePrefix: '+60',
    taxSystem: 'SST',
    timezone: 'Asia/Kuala_Lumpur',
    hasGstField: false,
  },
  {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    currencySymbol: 'C$',
    phonePrefix: '+1',
    taxSystem: 'NONE',
    timezone: 'America/Toronto',
    hasGstField: false,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    phonePrefix: '+44',
    taxSystem: 'VAT',
    timezone: 'Europe/London',
    hasGstField: false,
  },
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    phonePrefix: '+1',
    taxSystem: 'NONE',
    timezone: 'America/New_York',
    hasGstField: false,
  },
  {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    currencySymbol: 'A$',
    phonePrefix: '+61',
    taxSystem: 'GST',
    timezone: 'Australia/Sydney',
    hasGstField: false,
  },
  {
    code: 'OTHERS',
    name: 'Others',
    currency: 'USD',
    currencySymbol: '$',
    phonePrefix: '+1',
    taxSystem: 'NONE',
    timezone: 'UTC',
    hasGstField: false,
  }
];

@Controller('config')
export class ConfigController {
  /**
   * Returns country options for the onboarding country selector.
   * Public — no authentication required.
   */
  @Public()
  @SkipSubscriptionCheck()
  @Get('countries')
  getCountries(): CountryOption[] {
    return COUNTRIES;
  }
}
