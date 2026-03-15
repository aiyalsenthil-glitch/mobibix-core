/**
 * ════════════════════════════════════════════════════
 * PLAN CAPABILITIES (Derived)
 * ════════════════════════════════════════════════════
 *
 * Purpose: Boolean toggles derived from PlanFeature.
 * Single source of truth per feature.
 *
 * PATTERN:
 * - canGenerateReports ← PlanFeature.REPORTS
 * - canUseMultiShop ← PlanFeature.MULTI_SHOP
 * - canUseCustomPrintLayout ← PlanFeature.CUSTOM_PRINT_LAYOUT
 * - canUseWhatsAppAutomation ← PlanFeature.WHATSAPP_ALERTS_AUTOMATION
 *
 * NOTE: Limits (maxStaff, reminder quotas, etc.) are stored on Plan records
 *       and resolved via PlanRulesService.
 *       Member/customer counts are NOT limited by plan.
 */
export const PLAN_CAPABILITIES = {
  GYM_TRIAL: {
    // Core features
    staffAllowed: true,
    staff: true,
    staffInvite: true,
    attendance: true,

    // Premium features
    canGenerateReports: false,

    // WhatsApp features (disabled for Trial)
    canUseWhatsAppUtility: false,
    canUseWhatsAppMarketing: false,
    canUseWhatsAppAutomation: false,
  },

  GYM_STANDARD: {
    // Core features
    staffAllowed: true,
    staff: true,
    staffInvite: true,
    attendance: true,

    // Premium features
    canGenerateReports: false,

    // WhatsApp features (disabled for Standard)
    canUseWhatsAppUtility: false,
    canUseWhatsAppMarketing: false,
    canUseWhatsAppAutomation: false,
  },

  GYM_PRO: {
    // Core features
    staffAllowed: true,
    staff: true,
    staffInvite: true,
    attendance: true,

    // Premium features
    canGenerateReports: true,

    // WhatsApp features (enabled for Pro)
    canUseWhatsAppUtility: true,
    canUseWhatsAppMarketing: true,
    canUseWhatsAppAutomation: true,
  },

  MOBIBIX_TRIAL: {
    // Core features
    staffAllowed: true,
    staff: true,
    staffInvite: true,

    // Premium features (all false for Trial)
    canGenerateReports: false,
    canUseMultiShop: false,
    canUseCustomPrintLayout: false,

    // WhatsApp features (disabled for Trial)
    canUseWhatsAppUtility: false,
    canUseWhatsAppMarketing: false,
    canUseWhatsAppAutomation: false,
  },

  MOBIBIX_STANDARD: {
    // Core features
    staffAllowed: true,
    staff: true,
    staffInvite: true,

    // Premium features (all false for Standard)
    canGenerateReports: false,
    canUseMultiShop: false,
    canUseCustomPrintLayout: false,

    // WhatsApp features (disabled for Standard)
    canUseWhatsAppUtility: false,
    canUseWhatsAppMarketing: false,
    canUseWhatsAppAutomation: false,
  },

  MOBIBIX_PRO: {
    // Core features
    staffAllowed: true,
    staff: true,
    staffInvite: true,

    // Premium features (all true for Pro)
    canGenerateReports: true,
    canUseMultiShop: true,
    canUseCustomPrintLayout: true,

    // WhatsApp features (enabled for Pro)
    canUseWhatsAppUtility: true,
    canUseWhatsAppMarketing: true,
    canUseWhatsAppAutomation: true,
  },

  WHATSAPP_CRM: {
    // Core features
    staffAllowed: false,
    staff: false,
    staffInvite: false,

    // Premium features (add-on specific)
    canGenerateReports: false,
    canUseMultiShop: false,
    canUseCustomPrintLayout: false,

    // WhatsApp features (enabled for add-on)
    canUseWhatsAppUtility: true,
    canUseWhatsAppMarketing: true,
    canUseWhatsAppAutomation: true,
  },
} as const;
