/**
 * ════════════════════════════════════════════════════
 * PREMIUM FEATURE UNLOCK ENUM
 * ════════════════════════════════════════════════════
 *
 * Purpose: Represents features that are UNAVAILABLE on lower plans.
 * These features are gated via PlanFeature table.
 *
 * ALLOWED HERE:
 * - Premium reporting/analytics unlocks
 * - Multi-tenancy/multi-location support
 * - Customization features (branding, layouts)
 * - Advanced automation/integration features
 *
 * NOT ALLOWED HERE:
 * - Core domain entities (members, staff, attendance, etc.)
 * - Existence/availability of basic entities
 * - Quantity limits (use PlanLimits instead)
 * - Basic notifications (use PlanLimits quotas instead)
 *
 * RELATIONSHIP:
 * - WhatsAppFeature ← PlanFeature ← Plan (1:N:1)
 * - PlanLimits handles quotas, counts, visibility windows
 * - PlanCapabilities derives boolean toggles from PlanFeature
 */
export enum WhatsAppFeature {
  // Premium Features Only (gated by plan)
  REPORTS = 'REPORTS',
  CUSTOM_PRINT_LAYOUT = 'CUSTOM_PRINT_LAYOUT',
  MULTI_SHOP = 'MULTI_SHOP',
  WHATSAPP_ALERTS_AUTOMATION = 'WHATSAPP_ALERTS_AUTOMATION',
  WHATSAPP_UTILITY = 'WHATSAPP_UTILITY',
  WHATSAPP_MARKETING = 'WHATSAPP_MARKETING',
  WHATSAPP_AUTOMATION = 'WHATSAPP_AUTOMATION',
  WHATSAPP_TEAM_INBOX = 'WHATSAPP_TEAM_INBOX',
  WHATSAPP_WEBHOOKS = 'WHATSAPP_WEBHOOKS',
  WHATSAPP_API_ACCESS = 'WHATSAPP_API_ACCESS',
  WHATSAPP_CRM = 'WHATSAPP_CRM',
  /**
   * Gates access to the Official WhatsApp API (Authkey / Meta Cloud).
   * Without this feature, tenants can only use Web Mode (Baileys QR).
   * Included in: WA_OFFICIAL_STARTER, WA_OFFICIAL_PRO, WA_OFFICIAL_BUSINESS addon plans.
   */
  WHATSAPP_OFFICIAL_API = 'WHATSAPP_OFFICIAL_API',
  /**
   * Gates access to SMS sending via Authkey.
   * Included in: WA_OFFICIAL_PRO and above.
   */
  WHATSAPP_SMS = 'WHATSAPP_SMS',
}
