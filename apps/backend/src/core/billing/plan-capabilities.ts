export const PLAN_CAPABILITIES = {
  TRIAL: {
    staffAllowed: true,
    staff: true,
    staffInvite: true,
    maxStaff: 3,
    memberLimit: 25, // keep limit if you want
    attendance: true,
    whatsapp: true,
    reports: true,
  },

  BASIC: {
    staffAllowed: false,
    maxStaff: 0,
    memberLimit: 100,
    whatsapp: false,
    reports: false,
  },
  PLUS: {
    staffAllowed: true,
    staff: true, // 🔴 ADD
    staffInvite: true, // 🔴 ADD (if used)
    maxStaff: 3,
    memberLimit: 999,
    whatsapp: true,
    reports: true,
  },
  PRO: {
    staffAllowed: true,
    maxStaff: Number.MAX_SAFE_INTEGER,
    staff: true, // 🔴 ADD
    staffInvite: true, // 🔴 ADD (if used)
    memberLimit: 9999,
    attendance: true,
    whatsapp: true,
    reports: true,
  },
  ULTIMATE: {
    staffAllowed: true,
    staff: true, // 🔴 ADD
    staffInvite: true, // 🔴 ADD (if used)
    maxStaff: Number.MAX_SAFE_INTEGER,
    memberLimit: 999999,
    attendance: true,
    whatsapp: true,
    reports: true,
  },
} as const;
