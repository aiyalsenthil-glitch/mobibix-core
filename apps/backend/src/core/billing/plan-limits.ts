export const PLAN_LIMITS: Record<
  string,
  {
    maxMembers: number | null;
  }
> = {
  TRIAL: {
    maxMembers: 25,
  },
  BASIC: {
    maxMembers: 100,
  },
  PRO: {
    maxMembers: null, // unlimited
  },
};
