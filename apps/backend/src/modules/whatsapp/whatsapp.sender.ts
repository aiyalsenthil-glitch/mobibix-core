import axios from 'axios';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  WHATSAPP_PLAN_RULES,
  WhatsAppFeature,
} from '../../core/billing/whatsapp-rules';
import { toWhatsAppPhone } from '../../common/utils/phone.util';

@Injectable()
export class WhatsAppSender {
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private readonly token = process.env.WHATSAPP_ACCESS_TOKEN;
  private readonly apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';

  constructor(private readonly prisma: PrismaService) {}

  async sendTemplateMessage(
    tenantId: string,
    feature: WhatsAppFeature,
    phone: string,
    templateName: string,
    parameters: string[],
  ): Promise<{ success: boolean; error?: any; skipped?: boolean }> {
    // ─────────────────────────────
    // 1️⃣ Load subscription + plan
    // ─────────────────────────────
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription?.plan) {
      return { success: false, skipped: true };
    }

    const planName = subscription.plan.name as keyof typeof WHATSAPP_PLAN_RULES;
    const rule = WHATSAPP_PLAN_RULES[planName];

    // ─────────────────────────────
    // 2️⃣ Plan-level WhatsApp block
    // ─────────────────────────────
    if (!rule?.enabled) {
      return { success: false, skipped: true };
    }

    // ─────────────────────────────
    // 3️⃣ Feature check
    // ─────────────────────────────
    if (!rule.features.includes(feature)) {
      return { success: false, skipped: true };
    }

    // ─────────────────────────────
    // 4️⃣ Member limit check
    // ─────────────────────────────
    const memberCount = await this.prisma.member.count({
      where: { tenantId },
    });

    if (memberCount > rule.maxMembers) {
      return { success: false, skipped: true };
    }

    // ─────────────────────────────
    // 5️⃣ SEND WHATSAPP
    // ─────────────────────────────
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    try {
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: toWhatsAppPhone(phone), // ✅ ADD 91 HERE ONLY
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components: parameters.length
              ? [
                  {
                    type: 'body',
                    parameters: parameters.map((text) => ({
                      type: 'text',
                      text,
                    })),
                  },
                ]
              : [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }
}
