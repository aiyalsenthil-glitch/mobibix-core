import axios from 'axios';
import { Injectable } from '@nestjs/common';
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
    // 1️⃣ Load ACTIVE/TRIAL subscription
    // ─────────────────────────────
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      orderBy: { startDate: 'desc' },
      include: { plan: true },
    });

    if (!subscription?.plan) {
      return { success: false, skipped: true };
    }

    const planName = subscription.plan.name as keyof typeof WHATSAPP_PLAN_RULES;
    const rule = WHATSAPP_PLAN_RULES[planName];

    console.log('[WA DEBUG]', {
      tenantId,
      plan: planName,
      enabled: rule?.enabled,
      features: rule?.features,
    });

    // ─────────────────────────────
    // 2️⃣ Plan-level block
    // ─────────────────────────────
    if (!rule?.enabled) {
      return { success: false, skipped: true };
    }

    // ─────────────────────────────
    // 3️⃣ Feature-level block
    // ─────────────────────────────
    if (!(rule.features as WhatsAppFeature[]).includes(feature)) {
      return { success: false, skipped: true };
    }

    // ─────────────────────────────
    // 4️⃣ Member limit check
    // ─────────────────────────────
    const memberCount = await this.prisma.member.count({
      where: { tenantId },
    });

    if (rule.maxMembers > 0 && memberCount > rule.maxMembers) {
      return { success: false, skipped: true };
    }

    // ─────────────────────────────
    // 5️⃣ SEND WHATSAPP (Cloud API)
    // ─────────────────────────────
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    try {
      const res = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: toWhatsAppPhone(phone),
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' }, // ✅ VERIFIED FROM API
            components: [
              {
                type: 'body',
                parameters: parameters.map((text) => ({
                  type: 'text',
                  text,
                })),
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('[WA META RESPONSE]', res.data);
      return { success: true };
    } catch (error) {
      console.error('[WA META ERROR]', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }
}
