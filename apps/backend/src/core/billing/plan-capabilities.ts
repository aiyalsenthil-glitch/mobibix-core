export const PLAN_CAPABILITIES = {
  BASIC: {
    staffAllowed: false,
    maxStaff: 0,
    attendance: true,
    whatsapp: false,
    reports: false,
  },

  PLUS: {
    staffAllowed: true,
    maxStaff: 3,
    attendance: true,
    whatsapp: true,
    reports: true,
  },

  PRO: {
    staffAllowed: true,
    maxStaff: Infinity,
    attendance: true,
    whatsapp: true,
    reports: true,
  },

  ULTIMATE: {
    staffAllowed: true,
    maxStaff: Infinity,
    attendance: true,
    whatsapp: true,
    reports: true,
  },
} as const;
