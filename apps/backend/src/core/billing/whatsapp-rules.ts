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
}
