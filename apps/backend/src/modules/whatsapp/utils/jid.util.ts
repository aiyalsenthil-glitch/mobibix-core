/**
 * Strict Phone Number Validation (E.164)
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  return /^\d+$/.test(phone) && phone.length >= 8 && phone.length <= 15;
}

/**
 * Extracts pure phone number ONLY if it looks like a real phone.
 * Returns null for @lid, @g.us, etc.
 */
export function extractPhoneFromJid(jid: string): string | null {
  if (!jid) return null;
  
  // LID and other internal IDs are not clean phone numbers
  if (jid.includes('@lid') || jid.includes('broadcast') || jid.includes('status')) {
    return null;
  }

  const userPart = jid.split('@')[0];
  const cleanId = userPart.split(':')[0];

  return isValidPhoneNumber(cleanId) ? cleanId : null;
}

/**
 * Returns a stable conversation identifier.
 * For groups, its the group JID.
 * For users, its the participant JID or LID.
 */
export function normalizeJid(jid: string): string {
  if (!jid) return 'unknown';
  // Keep the full JID as the stable identifier
  return jid.split(':')[0]; // Remove device suffix but keep @domain
}
