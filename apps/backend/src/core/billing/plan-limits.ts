/**
 * ════════════════════════════════════════════════════
 * PLAN LIMITS (Quantitative Controls)
 * ════════════════════════════════════════════════════
 *
 * @deprecated Use PlanRulesService (DB-driven) as the PRIMARY source.
 * This constant is kept ONLY as a fallback for fields not yet in the
 * Plan model (e.g., reminderQuotaPerDay). WhatsApp quotas (utility,
 * marketing) are now read from the DB via PlanRulesService.
 *
 * TODO: Migrate reminderQuotaPerDay to Plan model, then remove this file.
 *
 * CUSTOMERS ARE NEVER LIMITED.
 */
export const PLAN_LIMITS: Record<
  string,
  {
    maxStaff?: number | null;
    maxMembers?: number | null;
    reminderQuotaPerDay?: number | null;
    analyticsHistoryDays?: number;
    whatsapp?: {
      messageQuota: number;
      isDaily?: boolean;
    };
  }
> = {
  GYM_TRIAL: {
    maxStaff: 3,
    maxMembers: 50,
    analyticsHistoryDays: 30,
    whatsapp: { messageQuota: 0 }, // Disabled for Trial
  },
  GYM_STANDARD: {
    maxStaff: 3,
    maxMembers: 200,
    analyticsHistoryDays: 90,
    whatsapp: { messageQuota: 0 }, // Disabled for Standard
  },
  GYM_PRO: {
    maxStaff: null, // unlimited
    maxMembers: null, // unlimited
    analyticsHistoryDays: 365,
    whatsapp: { messageQuota: 1200 }, // 1000 + 200
  },
  MOBIBIX_TRIAL: {
    maxStaff: 3,
    maxMembers: 50,
    reminderQuotaPerDay: 50,
    analyticsHistoryDays: 30,
    whatsapp: { messageQuota: 0 }, // Disabled for Trial
  },
  MOBIBIX_STANDARD: {
    maxStaff: 3,
    maxMembers: 200,
    reminderQuotaPerDay: 300,
    analyticsHistoryDays: 90,
    whatsapp: { messageQuota: 0 }, // Disabled for Standard
  },
  MOBIBIX_PRO: {
    maxStaff: null, // unlimited
    maxMembers: null, // unlimited
    reminderQuotaPerDay: null, // unlimited
    analyticsHistoryDays: 365,
    whatsapp: { messageQuota: 1200 }, // 1000 + 200
  },
  WHATSAPP_CRM: {
    whatsapp: { messageQuota: 3000 }, // 2000 + 1000
  },
};

export type PlanLimitRules = typeof PLAN_LIMITS.GYM_TRIAL;
