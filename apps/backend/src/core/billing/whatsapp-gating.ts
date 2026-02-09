import { WhatsAppFeature } from './whatsapp-rules';

/**
 * ════════════════════════════════════════════════════
 * WHATSAPP EVENT FEATURE MAPPING
 * ════════════════════════════════════════════════════
 *
 * CRITICAL CHANGE: Core notifications (welcome, payment due, reminders)
 * are NO LONGER gated. They are always-on.
 *
 * ONLY premium features (WHATSAPP_ALERTS_AUTOMATION) require feature gates.
 *
 * Mapping is preserved for logging/analytics only.
 * Do NOT use this map for feature enforcement.
 */
export const WhatsAppFeatureEventMap: Record<string, string> = {
  // CORE NOTIFICATIONS (Always-on, never gated)
  MEMBER_CREATED: 'WELCOME_NOTIFICATION',
  MEMBERSHIP_EXPIRY: 'EXPIRY_NOTIFICATION',
  MEMBERSHIP_EXPIRED: 'PAYMENT_DUE_NOTIFICATION',
  PAYMENT_DUE: 'PAYMENT_DUE_NOTIFICATION',
  INVOICE_CREATED: 'PAYMENT_DUE_NOTIFICATION',
  CUSTOM_REMINDER: 'REMINDER_NOTIFICATION',
  JOB_READY: 'REMINDER_NOTIFICATION',
  JOB_UPDATE: 'REMINDER_NOTIFICATION',
};

/**
 * Resolves the required feature for a given template/event context.
 * For now, we rely on the passed 'feature' enum from the caller,
 * but this map can be used for verification.
 */
export function getRequiredFeatureForEvent(eventType: string): string | null {
  return WhatsAppFeatureEventMap[eventType] || null;
}
