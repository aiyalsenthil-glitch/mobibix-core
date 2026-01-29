export enum WhatsAppFeature {
  WELCOME = 'WELCOME',
  EXPIRY = 'EXPIRY',
  PAYMENT_DUE = 'PAYMENT_DUE',
  REMINDER = 'REMINDER',
}
export const WHATSAPP_PLAN_RULES = {
  BASIC: {
    enabled: false,
    features: [],
    maxMembers: 0,
  },
  PLUS: {
    enabled: true,
    features: [WhatsAppFeature.PAYMENT_DUE, WhatsAppFeature.REMINDER],
    maxMembers: 50,
  },
  PRO: {
    enabled: true,
    features: [WhatsAppFeature.PAYMENT_DUE, WhatsAppFeature.REMINDER],
    maxMembers: 600,
  },
  ULTIMATE: {
    enabled: true,
    features: [
      WhatsAppFeature.WELCOME,
      WhatsAppFeature.EXPIRY,
      WhatsAppFeature.PAYMENT_DUE,
      WhatsAppFeature.REMINDER,
    ],
    maxMembers: 500,
  },
} satisfies Record<
  string,
  {
    enabled: boolean;
    features: WhatsAppFeature[];
    maxMembers: number;
  }
>;
