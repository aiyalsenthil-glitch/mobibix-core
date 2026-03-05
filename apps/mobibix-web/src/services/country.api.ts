/**
 * Country Config API Service
 *
 * Fetches the country list from GET /api/config/countries.
 * Falls back to a static list if the request fails (e.g. offline/cold start).
 *
 * Used by: Web onboarding page
 * Android equivalent: Will call the same endpoint via Retrofit in Phase 2.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export interface CountryOption {
  code: string;           // ISO 3166-1 alpha-2 (e.g. "IN")
  name: string;           // Display name (e.g. "India")
  currency: string;       // ISO 4217 (e.g. "INR")
  currencySymbol: string; // e.g. "₹"
  phonePrefix: string;    // e.g. "+91"
  taxSystem: string;      // "GST" | "VAT" | "SST" | "NONE"
  timezone: string;       // IANA (e.g. "Asia/Kolkata")
  hasGstField: boolean;   // Show GST/Tax ID field in onboarding
}

/** Static fallback — mirrors the backend precisely */
export const COUNTRY_FALLBACK: CountryOption[] = [
  { code: "IN", name: "India",                   currency: "INR", currencySymbol: "₹",   phonePrefix: "+91",  taxSystem: "GST",  timezone: "Asia/Kolkata",       hasGstField: true  },
  { code: "AE", name: "United Arab Emirates",    currency: "AED", currencySymbol: "د.إ", phonePrefix: "+971", taxSystem: "VAT",  timezone: "Asia/Dubai",         hasGstField: false },
  { code: "SG", name: "Singapore",               currency: "SGD", currencySymbol: "S$",  phonePrefix: "+65",  taxSystem: "GST",  timezone: "Asia/Singapore",     hasGstField: false },
  { code: "MY", name: "Malaysia",                currency: "MYR", currencySymbol: "RM",  phonePrefix: "+60",  taxSystem: "SST",  timezone: "Asia/Kuala_Lumpur",  hasGstField: false },
  { code: "CA", name: "Canada",                  currency: "CAD", currencySymbol: "C$",  phonePrefix: "+1",   taxSystem: "NONE", timezone: "America/Toronto",    hasGstField: false },
  { code: "GB", name: "United Kingdom",          currency: "GBP", currencySymbol: "£",   phonePrefix: "+44",  taxSystem: "VAT",  timezone: "Europe/London",      hasGstField: false },
  { code: "US", name: "United States",           currency: "USD", currencySymbol: "$",   phonePrefix: "+1",   taxSystem: "NONE", timezone: "America/New_York",   hasGstField: false },
  { code: "AU", name: "Australia",               currency: "AUD", currencySymbol: "A$",  phonePrefix: "+61",  taxSystem: "GST",  timezone: "Australia/Sydney",   hasGstField: false },
];

/**
 * Fetches countries from the backend.
 * Returns the static fallback list if the request fails.
 */
export async function fetchCountries(): Promise<CountryOption[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/config/countries`, {
      cache: "force-cache", // Cache aggressively — list rarely changes
      next: { revalidate: 3600 }, // Revalidate every hour (Next.js)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : COUNTRY_FALLBACK;
  } catch (err) {
    console.warn("[CountryAPI] Falling back to static list:", err);
    return COUNTRY_FALLBACK;
  }
}

/** Find a single country by its display name (legacy compatibility) */
export function findCountryByName(
  name: string,
  list: CountryOption[]
): CountryOption | undefined {
  return list.find((c) => c.name === name);
}

/** Find a single country by ISO code */
export function findCountryByCode(
  code: string,
  list: CountryOption[]
): CountryOption | undefined {
  return list.find((c) => c.code === code);
}
