/**
 * Normalize phone numbers to international format (India default)
 *
 * Rules:
 * - Remove spaces, +, -, ()
 * - If 10 digits → prefix with 91
 * - If already starts with country code → keep
 */
export function normalizePhone(phone: string): string {
  if (!phone) return phone;

  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // India default: 10-digit local number
  if (digits.length === 10) {
    return '91' + digits;
  }

  // Already normalized (e.g. 91xxxxxxxxxx)
  return digits;
}
