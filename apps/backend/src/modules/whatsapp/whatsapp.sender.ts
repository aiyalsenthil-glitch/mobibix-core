import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppFeature } from '../../core/billing/whatsapp-rules';
import { toWhatsAppPhone, normalizePhone } from '../../common/utils/phone.util';
import { WhatsAppLogger } from './whatsapp.logger';
import { WhatsAppPhoneNumbersService } from './phone-numbers/whatsapp-phone-numbers.service';
import { WhatsAppPhoneNumberPurpose } from '@prisma/client';
import { PlanRulesService } from '../../core/billing/plan-rules.service';

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
    private readonly planRulesService: PlanRulesService,
  ) {}

  /**
   * Map WhatsApp feature to phone number purpose
   */
  private mapFeatureToPurpose(
    feature: WhatsAppFeature,
  ): WhatsAppPhoneNumberPurpose {
    const mapping: Partial<Record<WhatsAppFeature, WhatsAppPhoneNumberPurpose>> = {
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
    reason?: string;
  }> {
    // 🔍 GUARDRAIL 1: Backward Compatibility & Empty Features
    // 🔍 GUARDRAIL 1: Backward Compatibility & Empty Features
    // Fetch rules specifically for this check
    const planRules = await this.planRulesService.getPlanRulesForTenant(tenantId);
    
    // If no rules (no plan?) or NO features defined (Trial/Legacy), ALLOW ALL.
    const isLegacyOrTrial = !planRules || !planRules.features || planRules.features.length === 0;

    if (!isLegacyOrTrial) {
      // 🔒 GATE: Check if tenant has the specific feature entitlement
      
      const hasEntitlement = planRules.features.includes(feature);

      if (!hasEntitlement) {
        await this.logger.log({
          tenantId,
          memberId: null,
          phone,
          type: feature,
          status: 'SKIPPED',
          error: `Plan missing feature: ${feature}`,
        });
        return {
          success: false,
          skipped: true,
          error: `Plan missing feature: ${feature}`,
        };
      }
    }

    // 🔍 GUARDRAIL 2: DAILY QUOTA FOR TRIAL PLAN
    // Max 10 messages per day per tenant
    if (planRules?.code === 'TRIAL') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const count = await this.prisma.whatsAppLog.count({
        where: {
          tenantId,
          sentAt: { gte: today },
          status: { in: ['SENT', 'DELIVERED'] },
        },
      });

      if (count >= 10) {
        await this.logger.log({
          tenantId,
          memberId: null,
          phone,
          type: feature,
          status: 'SKIPPED',
          error: 'Daily WhatsApp quota exceeded for TRIAL plan (Max 10)',
        });
        return {
          success: false,
          skipped: true,
          error: 'Daily WhatsApp quota exceeded for TRIAL plan',
        };
      }
    }

    // ✅ NORMALIZE PHONE: Convert any format to 10 digits, then to 91XXXXXXXXXX
    const normalizedPhone = normalizePhone(phone);
    let whatsappFormattedPhone: string;

    try {
      whatsappFormattedPhone = toWhatsAppPhone(normalizedPhone);
    } catch (error: any) {
      await this.logger.log({
        tenantId,
        memberId: null,
        phone,
        type: feature,
        status: 'FAILED',
        error: `Invalid phone format: ${error?.message || 'Unknown error'}`,
      });
      return { success: false, error: error?.message };
    }

    // ─────────────────────────────
    // 1️⃣ Check WhatsApp Settings (enabled check)
    // ─────────────────────────────
    const setting = await this.prisma.whatsAppSetting.findUnique({
      where: { tenantId },
    });

    // PERMISSIVE CHECK:
    // Only block if setting explicitly exists and is set to false.
    // If setting is missing, assume enabled (plan limits will govern access).
    if (setting && setting.enabled === false) {
      await this.logger.log({
        tenantId,
        memberId: null,
        phone,
        type: feature,
        status: 'FAILED',
        error: 'WhatsApp is disabled in tenant settings',
      });
      return { success: false, skipped: true, reason: 'WhatsApp disabled in settings' };
    }
    
    // Previous "Tenant.whatsappEnabled" check is removed to prevent accidental blocking.
    // Logic now relies on Plan Rules (checked below) as the primary gatekeeper.

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
      return { success: false, skipped: true, reason: `No active phone number: ${error.message}` };
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
      return { success: false, skipped: true, reason: 'Phone number inactive' };
    }

    // ─────────────────────────────
    // 3️⃣ Plan rules (DB-driven)
    // ─────────────────────────────
    // Reuse planRules fetched above
    
    if (planRules && !planRules.enabled) {
      return { success: false, skipped: true, reason: 'Subscription plan disabled' };
    }

    // Feature check already done above for strict cases.
    // Legacy/Trial skipped the check, so we don't block them here.

    // ─────────────────────────────
    // 4️⃣ Member limit check
    // ─────────────────────────────
    const memberCount = await this.prisma.member.count({
      where: { tenantId },
    });

    if (planRules && planRules.maxMembers > 0 && memberCount > planRules.maxMembers) {
      return { success: false, skipped: true, reason: 'Plan member limit exceeded' };
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
          to: whatsappFormattedPhone,
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
        phone: whatsappFormattedPhone,
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
        phone: whatsappFormattedPhone || phone,
        type: feature,
        status: 'FAILED',
        error: errMsg,
      });

      console.error('[WA META ERROR]', errMsg);

      return { success: false, error: errMsg };
    }
  }
}
