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

  // If it looks like a JID (contains @) or has no digits (like 'status'), return as is
  if (phone.includes('@') || !/[0-9]/.test(phone)) {
    return phone;
  }

  const digits = phone.replace(/\D/g, '');

  // If it's an Indian number in common formats, keep the last 10 digits
  if (digits.length === 10) {
    return digits;
  }
  
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(-10);
  }

  // For other lengths, return the cleaned digits. 
  // This avoids truncating global numbers (lengths 8-15).
  return digits;
}
/**
 * Convert canonical phone to WhatsApp format
 */
export function toWhatsAppPhone(phone: string): string {
  if (!phone) {
    throw new Error('Invalid phone for WhatsApp');
  }

  // If it's already a JID or contains non-digits, return as is
  if (phone.includes('@') || !/^[0-9]+$/.test(phone)) {
    return phone;
  }

  const cleaned = phone.replace(/\D/g, '');

  // If it's 10 digits, assume India prepended with 91
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  // If it's already longer, assume it has a country code
  return cleaned;
}
