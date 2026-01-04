export const PLAN_CAPABILITIES = {
  TRIAL: {
    staffAllowed: false,
    maxStaff: 0,
    memberLimit: 25,
    whatsapp: false,
    reports: false,
  },
  BASIC: {
    staffAllowed: false,
    maxStaff: 0,
    memberLimit: 50,
    whatsapp: false,
    reports: false,
  },
  PLUS: {
    staffAllowed: true,
    maxStaff: 3,
    memberLimit: 100,
    whatsapp: true,
    reports: true,
  },
  PRO: {
    staffAllowed: true,
    maxStaff: Number.MAX_SAFE_INTEGER,
    memberLimit: 9999,
    whatsapp: true,
    reports: true,
  },
  ULTIMATE: {
    staffAllowed: true,
    maxStaff: Number.MAX_SAFE_INTEGER,
    attendance: true,
    whatsapp: true,
    reports: true,
  },
} as const;
