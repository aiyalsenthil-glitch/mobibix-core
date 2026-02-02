import { WhatsAppFeature } from './whatsapp-rules';

/**
 * Maps Automation Events to their Required Plan Feature.
 * 
 * GUARDRAIL 2: No "partial" WhatsApp sends. 
 * If a plan has WHATSAPP_ALERTS_BASIC, it can ONLY send events mapped here.
 * Any event NOT in this map is considered "Unrestricted" or "System Critical" 
 * unless caught by default logic. 
 * 
 * ACTUALLY: The requirement is "If a plan has WHATSAPP_ALERTS_BASIC... Allow only mapped events".
 * So we must map ALL events to a feature if we want to strict gate them.
 */
export const WhatsAppFeatureEventMap: Record<string, WhatsAppFeature> = {
    // Utility / System (Often free or basic)
    'MEMBER_CREATED': WhatsAppFeature.WELCOME, // WELCOME
    'MEMBERSHIP_EXPIRY': WhatsAppFeature.EXPIRY, // EXPIRY
    
    // Billing
    'MEMBERSHIP_EXPIRED': WhatsAppFeature.PAYMENT_DUE, // PAYMENT_DUE
    'PAYMENT_DUE': WhatsAppFeature.PAYMENT_DUE,
    'INVOICE_CREATED': WhatsAppFeature.PAYMENT_DUE, 
    
    // Custom / Reminders
    'CUSTOM_REMINDER': WhatsAppFeature.REMINDER, // REMINDER
    'JOB_READY': WhatsAppFeature.REMINDER,
    'JOB_UPDATE': WhatsAppFeature.REMINDER,
};

/**
 * Resolves the required feature for a given template/event context.
 * For now, we rely on the passed 'feature' enum from the caller, 
 * but this map can be used for verification.
 */
export function getRequiredFeatureForEvent(eventType: string): WhatsAppFeature | null {
    return WhatsAppFeatureEventMap[eventType] || null;
}
