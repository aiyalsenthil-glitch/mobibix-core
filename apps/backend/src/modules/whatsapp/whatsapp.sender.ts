import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  WHATSAPP_PLAN_RULES,
  WhatsAppFeature,
} from '../../core/billing/whatsapp-rules';
import { toWhatsAppPhone } from '../../common/utils/phone.util';
import { WhatsAppLogger } from './whatsapp.logger';
import { WhatsAppPhoneNumbersService } from './phone-numbers/whatsapp-phone-numbers.service';
import { WhatsAppPhoneNumberPurpose } from '@prisma/client';

@Injectable()
export class WhatsAppSender {
  // ⚠️ REMOVED: No hardcoded phone number ID
  // private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private readonly token = process.env.WHATSAPP_ACCESS_TOKEN;
  private readonly apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WhatsAppLogger,
    private readonly phoneNumbersService: WhatsAppPhoneNumbersService,
  ) {}

  /**
   * Map WhatsApp feature to phone number purpose
   */
  private mapFeatureToPurpose(
    feature: WhatsAppFeature,
  ): WhatsAppPhoneNumberPurpose {
    const mapping: Record<WhatsAppFeature, WhatsAppPhoneNumberPurpose> = {
      WELCOME: 'DEFAULT',
      PAYMENT_DUE: 'BILLING',
      EXPIRY: 'REMINDER',
      REMINDER: 'REMINDER',
    };
    return mapping[feature] || 'DEFAULT';
  }

  async sendTemplateMessage(
    tenantId: string,
    feature: WhatsAppFeature,
    phone: string,
    templateName: string,
    parameters: string[],
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: any;
    skipped?: boolean;
  }> {
    // ─────────────────────────────
    // 1️⃣ Check WhatsApp Settings (enabled check)
    // ─────────────────────────────
    const setting = await this.prisma.whatsAppSetting.findUnique({
      where: { tenantId },
    });

    if (!setting?.enabled) {
      await this.logger.log({
        tenantId,
        memberId: null,
        phone,
        type: feature,
        status: 'FAILED',
        error: 'WhatsApp is disabled for this tenant',
      });
      return { success: false, skipped: true };
    }

    // ─────────────────────────────
    // 2️⃣ Get Dynamic Phone Number from DB
    // ─────────────────────────────
    const purpose = this.mapFeatureToPurpose(feature);
    let phoneNumberConfig;

    try {
      phoneNumberConfig =
        await this.phoneNumbersService.getPhoneNumberForPurpose(
          tenantId,
          purpose,
        );
    } catch (error) {
      await this.logger.log({
        tenantId,
        memberId: null,
        phone,
        type: feature,
        status: 'FAILED',
        error: `No active phone number found for purpose ${purpose}: ${error.message}`,
      });
      return { success: false, skipped: true };
    }

    if (!phoneNumberConfig.isActive) {
      await this.logger.log({
        tenantId,
        memberId: null,
        phone,
        type: feature,
        status: 'FAILED',
        error: 'Phone number is inactive',
      });
      return { success: false, skipped: true };
    }

    // ─────────────────────────────
    // 3️⃣ Load ACTIVE/TRIAL subscription
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

    // ─────────────────────────────
    // 4️⃣ Plan-level block
    // ─────────────────────────────
    if (!rule?.enabled) {
      return { success: false, skipped: true };
    }

    // ─────────────────────────────
    // 5️⃣ Feature-level block
    // ─────────────────────────────
    if (!(rule.features as WhatsAppFeature[]).includes(feature)) {
      return { success: false, skipped: true };
    }

    // ─────────────────────────────
    // 6️⃣ Member limit check
    // ─────────────────────────────
    const memberCount = await this.prisma.member.count({
      where: { tenantId },
    });

    if (rule.maxMembers > 0 && memberCount > rule.maxMembers) {
      return { success: false, skipped: true };
    }

    // ─────────────────────────────
    // 7️⃣ SEND WHATSAPP (Cloud API) - Using Dynamic Phone Number ID
    // ─────────────────────────────
    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberConfig.phoneNumberId}/messages`;

    try {
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: toWhatsAppPhone(phone),
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
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

      const messageId = response.data?.messages?.[0]?.id;

      // ✅ LOG SUCCESS
      await this.logger.log({
        tenantId,
        memberId: null, // pass memberId later if needed
        phone,
        type: feature,
        status: 'SENT',
        messageId,
      });

      return { success: true, messageId };
    } catch (error) {
      const errMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;

      // ❌ LOG FAILURE
      await this.logger.log({
        tenantId,
        memberId: null,
        phone,
        type: feature,
        status: 'FAILED',
        error: errMsg,
      });

      console.error('[WA META ERROR]', errMsg);

      return { success: false, error: errMsg };
    }
  }
}
