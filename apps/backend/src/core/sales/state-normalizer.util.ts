/**
 * Normalizes Indian state names into standard ISO codes to ensure
 * exact matching for Inter/Intra state GST calculations.
 * 
 * E.g: "Tamilnadu" -> "TN", "tn " -> "TN"
 */

const STATE_CODE_MAP: Record<string, string> = {
  tn: "TN",
  tamilnadu: "TN",
  mh: "MH",
  maharashtra: "MH",
  maha: "MH",
  ka: "KA",
  karnataka: "KA",
  kl: "KL",
  kerala: "KL",
  dl: "DL",
  delhi: "DL",
  newdelhi: "DL",
  gj: "GJ",
  gujarat: "GJ",
  gujrat: "GJ",
  up: "UP",
  uttarpradesh: "UP",
  wb: "WB",
  westbengal: "WB",
  bengal: "WB",
  ap: "AP",
  andhrapradesh: "AP",
  ts: "TS",
  telangana: "TS",
  tg: "TS",
  py: "PY",
  pondy: "PY",
  puducherry: "PY",
  ponducherry: "PY",
};

export function normalizeStateCode(input?: string | null): string | null {
  if (!input) return null;

  // 1. Strip everything except letters and lowercase
  const raw = input.toLowerCase().replace(/[^a-z]/g, "");

  // 2. Direct Map Lookup
  if (STATE_CODE_MAP[raw]) {
    return STATE_CODE_MAP[raw];
  }

  // 3. Fallback: If it's effectively a 2-char code
  if (raw.length === 2) {
    return raw.toUpperCase();
  }

  return raw;
}
