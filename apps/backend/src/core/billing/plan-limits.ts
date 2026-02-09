/**
 * ════════════════════════════════════════════════════
 * PLAN LIMITS (Quantitative Controls)
 * ════════════════════════════════════════════════════
 *
 * Purpose: Staff count, quotas, visibility windows.
 *
 * CUSTOMERS ARE NEVER LIMITED.
 *
 * Rules:
 * - maxStaff: Hard cap on staff count (enforced at API)
 * - reminderQuotaPerDay: Daily reminder send limit
 * - analyticsHistoryDays: Lookback window for analytics
 * - whatsapp: Utility/marketing message quotas
 */
export const PLAN_LIMITS: Record<
  string,
  {
    maxStaff?: number | null;
    maxMembers?: number | null;
    reminderQuotaPerDay?: number | null;
    analyticsHistoryDays?: number;
    whatsapp?: {
      utility: number;
      marketing: number;
      isDaily?: boolean;
    };
  }
> = {
  GYM_TRIAL: {
    maxStaff: 3,
    maxMembers: 50,
    analyticsHistoryDays: 30,
    whatsapp: { utility: 0, marketing: 0 }, // Disabled for Trial
  },
  GYM_STANDARD: {
    maxStaff: 3,
    maxMembers: 200,
    analyticsHistoryDays: 90,
    whatsapp: { utility: 0, marketing: 0 }, // Disabled for Standard
  },
  GYM_PRO: {
    maxStaff: null, // unlimited
    maxMembers: null, // unlimited
    analyticsHistoryDays: 365,
    whatsapp: { utility: 1000, marketing: 200 },
  },
  MOBIBIX_TRIAL: {
    maxStaff: 3,
    maxMembers: 50,
    reminderQuotaPerDay: 50,
    analyticsHistoryDays: 30,
    whatsapp: { utility: 0, marketing: 0 }, // Disabled for Trial
  },
  MOBIBIX_STANDARD: {
    maxStaff: 3,
    maxMembers: 200,
    reminderQuotaPerDay: 300,
    analyticsHistoryDays: 90,
    whatsapp: { utility: 0, marketing: 0 }, // Disabled for Standard
  },
  MOBIBIX_PRO: {
    maxStaff: null, // unlimited
    maxMembers: null, // unlimited
    reminderQuotaPerDay: null, // unlimited
    analyticsHistoryDays: 365,
    whatsapp: { utility: 1000, marketing: 200 },
  },
  WHATSAPP_CRM: {
    whatsapp: { utility: 2000, marketing: 1000 },
  },
};

export type PlanLimitRules = typeof PLAN_LIMITS.GYM_TRIAL;
