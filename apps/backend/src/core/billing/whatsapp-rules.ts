export enum WhatsAppFeature {
  PAYMENT_DUE = 'PAYMENT_DUE',
}

export const WHATSAPP_PLAN_RULES = {
  BASIC: {
    enabled: false,
    features: [],
    maxMembers: 0,
  },

  PLUS: {
    enabled: true,
    features: [WhatsAppFeature.PAYMENT_DUE],
    maxMembers: 50,
  },

  PRO: {
    enabled: true,
    features: [WhatsAppFeature.PAYMENT_DUE],
    maxMembers: 50,
  },
} as const;
