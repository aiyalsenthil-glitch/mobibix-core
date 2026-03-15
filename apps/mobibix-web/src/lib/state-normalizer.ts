/**
 * Normalizes Indian state names into standard 2-letter ISO codes to ensure
 * exact matching for Inter/Intra state GST (CGST+SGST vs IGST) calculations.
 *
 * P1 GST Compliance: Complete map covering all 28 States + 8 Union Territories.
 * Kept in sync with apps/backend/src/core/sales/state-normalizer.util.ts
 */

const STATE_CODE_MAP: Record<string, string> = {
  // ── Andhra Pradesh
  ap: 'AP', andhrapradesh: 'AP',
  // ── Arunachal Pradesh
  ar: 'AR', arunachalpradesh: 'AR',
  // ── Assam
  as: 'AS', assam: 'AS',
  // ── Bihar
  br: 'BR', bihar: 'BR',
  // ── Chhattisgarh
  cg: 'CG', ct: 'CG', chhattisgarh: 'CG', chattisgarh: 'CG',
  // ── Goa
  ga: 'GA', goa: 'GA',
  // ── Gujarat
  gj: 'GJ', gujarat: 'GJ', gujrat: 'GJ',
  // ── Haryana
  hr: 'HR', haryana: 'HR',
  // ── Himachal Pradesh
  hp: 'HP', himachalpradesh: 'HP',
  // ── Jharkhand
  jh: 'JH', jharkhand: 'JH',
  // ── Karnataka
  ka: 'KA', karnataka: 'KA',
  // ── Kerala
  kl: 'KL', kerala: 'KL',
  // ── Madhya Pradesh
  mp: 'MP', madhyapradesh: 'MP',
  // ── Maharashtra
  mh: 'MH', maharashtra: 'MH', maha: 'MH',
  // ── Manipur
  mn: 'MN', manipur: 'MN',
  // ── Meghalaya
  ml: 'ML', meghalaya: 'ML',
  // ── Mizoram
  mz: 'MZ', mizoram: 'MZ',
  // ── Nagaland
  nl: 'NL', nagaland: 'NL',
  // ── Odisha
  od: 'OD', or: 'OD', odisha: 'OD', orissa: 'OD',
  // ── Punjab
  pb: 'PB', punjab: 'PB',
  // ── Rajasthan
  rj: 'RJ', rajasthan: 'RJ',
  // ── Sikkim
  sk: 'SK', sikkim: 'SK',
  // ── Tamil Nadu
  tn: 'TN', tamilnadu: 'TN',
  // ── Telangana
  ts: 'TS', tg: 'TS', telangana: 'TS',
  // ── Tripura
  tr: 'TR', tripura: 'TR',
  // ── Uttar Pradesh
  up: 'UP', uttarpradesh: 'UP',
  // ── Uttarakhand
  uk: 'UK', ua: 'UK', uttarakhand: 'UK', uttaranchal: 'UK',
  // ── West Bengal
  wb: 'WB', westbengal: 'WB', bengal: 'WB',
  // ── Delhi (UT)
  dl: 'DL', delhi: 'DL', newdelhi: 'DL',
  // ── Jammu & Kashmir (UT)
  jk: 'JK', jammukashmir: 'JK', jammu: 'JK', kashmir: 'JK',
  // ── Ladakh (UT)
  la: 'LA', ladakh: 'LA',
  // ── Chandigarh (UT)
  ch: 'CH', chandigarh: 'CH',
  // ── Puducherry / Pondicherry (UT)
  py: 'PY', pondy: 'PY', puducherry: 'PY', pondicherry: 'PY', ponducherry: 'PY',
  // ── Dadra and Nagar Haveli & Daman and Diu (UT)
  dn: 'DN', dd: 'DD', dadra: 'DN', daman: 'DD',
  // ── Andaman and Nicobar Islands (UT)
  an: 'AN', andaman: 'AN', andamannicobar: 'AN',
  // ── Lakshadweep (UT)
  ld: 'LD', lakshadweep: 'LD',
};

export function normalizeStateCode(input?: string | null): string | null {
  if (!input) return null;

  // 1. Strip everything except letters and lowercase
  const raw = input.toLowerCase().replace(/[^a-z]/g, '');

  // 2. Direct map lookup
  if (STATE_CODE_MAP[raw]) {
    return STATE_CODE_MAP[raw];
  }

  // 3. Fallback: if it looks like a 2-char code, uppercase it
  if (raw.length === 2) {
    return raw.toUpperCase();
  }

  // 4. Unknown — return uppercased (prevents silent wrong-branch)
  return raw.toUpperCase();
}

/** All 36 Indian States + UTs for UI dropdowns */
export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CG', name: 'Chhattisgarh' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'DD', name: 'Daman and Diu' },
  { code: 'DL', name: 'Delhi' },
  { code: 'DN', name: 'Dadra and Nagar Haveli' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'HR', name: 'Haryana' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'LA', name: 'Ladakh' },
  { code: 'LD', name: 'Lakshadweep' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MN', name: 'Manipur' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OD', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' },
  { code: 'PY', name: 'Puducherry' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TR', name: 'Tripura' },
  { code: 'TS', name: 'Telangana' },
  { code: 'UK', name: 'Uttarakhand' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'WB', name: 'West Bengal' },
];
