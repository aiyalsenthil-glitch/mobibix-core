export const PLAN_CAPABILITIES = {
  GYM_TRIAL: {
    staffAllowed: true,
    staff: true,
    staffInvite: true,
    maxStaff: 3,
    memberLimit: 25,
    attendance: true,
    whatsapp: true,
    reports: true,
  },

  GYM_STANDARD: {
    staffAllowed: true,
    staff: true,
    staffInvite: true,
    maxStaff: 3,
    memberLimit: 100,
    attendance: true,
    whatsapp: true,
    reports: false,
  },

  GYM_PRO: {
    staffAllowed: true,
    staff: true,
    staffInvite: true,
    maxStaff: Number.MAX_SAFE_INTEGER,
    memberLimit: 9999,
    attendance: true,
    whatsapp: true,
    reports: true,
  },

  MOBIBIX_STANDARD: {
    staffAllowed: true,
    staff: true,
    staffInvite: true,
    maxStaff: 3,
    memberLimit: 100,
    attendance: false,
    whatsapp: false,
    reports: false,
  },

  MOBIBIX_PRO: {
    staffAllowed: true,
    staff: true,
    staffInvite: true,
    maxStaff: Number.MAX_SAFE_INTEGER,
    memberLimit: 9999,
    attendance: false,
    whatsapp: false,
    reports: true,
  },

  WHATSAPP_CRM: {
    staffAllowed: false,
    staff: false,
    staffInvite: false,
    maxStaff: 0,
    memberLimit: 0,
    attendance: false,
    whatsapp: true,
    reports: false,
  },
} as const;
