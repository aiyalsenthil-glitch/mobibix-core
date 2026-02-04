import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppFeature } from '../../core/billing/whatsapp-rules';
import { toWhatsAppPhone, normalizePhone } from '../../common/utils/phone.util';
import { WhatsAppLogger } from './whatsapp.logger';
import { WhatsAppPhoneNumbersService } from './phone-numbers/whatsapp-phone-numbers.service';
import { WhatsAppPhoneNumberPurpose, ModuleType } from '@prisma/client';
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
   * Resolve tenant's module type (GYM or MOBILE_SHOP)
   */
  private async resolveTenantModule(tenantId: string): Promise<ModuleType> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantType: true },
    });

    if (!tenant?.tenantType) {
      // Default to MOBILE_SHOP if not found
      return ModuleType.MOBILE_SHOP;
    }

    const normalized = tenant.tenantType.toUpperCase();
    if (normalized === 'GYM') return ModuleType.GYM;
    return ModuleType.MOBILE_SHOP;
  }

  /**
   * Map WhatsApp feature to phone number purpose
   */
  private mapFeatureToPurpose(
    feature: WhatsAppFeature,
  ): WhatsAppPhoneNumberPurpose {
    const mapping: Partial<
      Record<WhatsAppFeature, WhatsAppPhoneNumberPurpose>
    > = {
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
    options?: {
      skipPlanCheck?: boolean;
      logId?: string;
      metadata?: Record<string, any> | null;
    },
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: any;
    skipped?: boolean;
    reason?: string;
  }> {
    const skipPlanCheck = options?.skipPlanCheck ?? false;
    const logId = options?.logId;
    const metadata = options?.metadata ?? undefined;

    const updateLogStatus = async (
      status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'SKIPPED',
      data?: { error?: string | null; messageId?: string | null },
    ) => {
      if (!logId) return;

      await this.prisma.whatsAppLog.update({
        where: { id: logId },
        data: {
          status,
          error: data?.error ?? undefined,
          messageId: data?.messageId ?? undefined,
          metadata: metadata ?? undefined,
        },
      });
    };

    const logFailure = async (
      errorMessage: string,
      skipped?: boolean,
      reason?: string,
    ) => {
      if (logId) {
        await updateLogStatus('FAILED', { error: errorMessage });
      } else {
        await this.logger.log({
          tenantId,
          memberId: null,
          phone,
          type: feature,
          status: skipped ? 'SKIPPED' : 'FAILED',
          error: errorMessage,
          metadata,
        });
      }

      return {
        success: false,
        skipped,
        reason,
        error: errorMessage,
      };
    };
    // 🔍 GUARDRAIL 1: Backward Compatibility & Empty Features
    // Fetch rules specifically for this check
    const module = await this.resolveTenantModule(tenantId);
    const planRules = await this.planRulesService.getPlanRulesForTenant(
      tenantId,
      module,
    );

    // If no rules (no plan?) or NO features defined (Trial/Legacy), ALLOW ALL.
    const isLegacyOrTrial =
      !planRules || !planRules.features || planRules.features.length === 0;

    if (!isLegacyOrTrial && !skipPlanCheck) {
      // 🔒 GATE: Check if tenant has the specific feature entitlement

      const hasEntitlement = planRules.features.includes(feature);

      if (!hasEntitlement) {
        return logFailure(
          `Plan missing feature: ${feature}`,
          true,
          'Plan missing feature',
        );
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
        return logFailure(
          'Daily WhatsApp quota exceeded for TRIAL plan (Max 10)',
          true,
          'Daily WhatsApp quota exceeded for TRIAL plan',
        );
      }
    }

    // ✅ NORMALIZE PHONE: Convert any format to 10 digits, then to 91XXXXXXXXXX
    const normalizedPhone = normalizePhone(phone);
    let whatsappFormattedPhone: string;

    try {
      whatsappFormattedPhone = toWhatsAppPhone(normalizedPhone);
    } catch (error: any) {
      return logFailure(
        `Invalid phone format: ${error?.message || 'Unknown error'}`,
      );
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
      return logFailure(
        'WhatsApp is disabled in tenant settings',
        true,
        'WhatsApp disabled in settings',
      );
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
      return logFailure(
        `No active phone number found for purpose ${purpose}: ${error.message}`,
        true,
        `No active phone number: ${error.message}`,
      );
    }

    if (!phoneNumberConfig.isActive) {
      return logFailure(
        'Phone number is inactive',
        true,
        'Phone number inactive',
      );
    }

    // ─────────────────────────────
    // 3️⃣ Plan rules (DB-driven)
    // ─────────────────────────────
    // Reuse planRules fetched above

    if (planRules && !planRules.enabled) {
      return logFailure(
        'Subscription plan disabled',
        true,
        'Subscription plan disabled',
      );
    }

    // Feature check already done above for strict cases.
    // Legacy/Trial skipped the check, so we don't block them here.

    // ─────────────────────────────
    // 4️⃣ Member limit check
    // ─────────────────────────────
    const memberCount = await this.prisma.member.count({
      where: { tenantId },
    });

    if (
      planRules &&
      planRules.maxMembers > 0 &&
      memberCount > planRules.maxMembers
    ) {
      return logFailure(
        'Plan member limit exceeded',
        true,
        'Plan member limit exceeded',
      );
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
      if (logId) {
        await updateLogStatus('SENT', { messageId: messageId ?? null });
      } else {
        await this.logger.log({
          tenantId,
          memberId: null, // pass memberId later if needed
          phone: whatsappFormattedPhone,
          type: feature,
          status: 'SENT',
          messageId,
          metadata,
        });
      }

      return { success: true, messageId };
    } catch (error) {
      const errMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;

      // ❌ LOG FAILURE
      if (logId) {
        await updateLogStatus('FAILED', { error: errMsg });
      } else {
        await this.logger.log({
          tenantId,
          memberId: null,
          phone: whatsappFormattedPhone || phone,
          type: feature,
          status: 'FAILED',
          error: errMsg,
          metadata,
        });
      }

      console.error('[WA META ERROR]', errMsg);

      return { success: false, error: errMsg };
    }
  }
}
