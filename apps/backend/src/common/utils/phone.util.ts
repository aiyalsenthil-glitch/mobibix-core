/**
 * Normalize phone numbers to canonical format (India)
 *
 * Canonical format:
 * - Last 10 digits only
 *
 * Examples:
 * +91 97895 09543 → 9789509543
 * 919789509543   → 9789509543
 * 9789509543     → 9789509543
 */
export function normalizePhone(phone: string): string {
  if (!phone) return phone;

  const digits = phone.replace(/\D/g, '');

  // Always keep last 10 digits
  return digits.slice(-10);
}
/**
 * Convert canonical phone (10 digits) to WhatsApp format
 */
export function toWhatsAppPhone(phone10: string): string {
  if (!phone10 || phone10.length !== 10) {
    throw new Error('Invalid phone for WhatsApp');
  }

  return `91${phone10}`;
}
