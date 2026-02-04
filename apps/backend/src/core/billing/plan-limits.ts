export const PLAN_LIMITS: Record<
  string,
  {
    maxMembers: number | null;
  }
> = {
  GYM_TRIAL: {
    maxMembers: 25,
  },
  GYM_STANDARD: {
    maxMembers: 100,
  },
  GYM_PRO: {
    maxMembers: null, // unlimited
  },
  MOBIBIX_TRIAL: {
    maxMembers: 100,
  },
  MOBIBIX_STANDARD: {
    maxMembers: 100,
  },
  MOBIBIX_PRO: {
    maxMembers: null, // unlimited
  },
  WHATSAPP_CRM: {
    maxMembers: null,
  },
};
