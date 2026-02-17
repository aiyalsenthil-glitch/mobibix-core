import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppFeature } from '../../core/billing/whatsapp-rules';
import { toWhatsAppPhone, normalizePhone } from '../../common/utils/phone.util';
import { WhatsAppLogger } from './whatsapp.logger';
import { WhatsAppPhoneNumbersService } from './phone-numbers/whatsapp-phone-numbers.service';
import { WhatsAppPhoneNumberPurpose, ModuleType } from '@prisma/client';
import { PlanRulesService } from '../../core/billing/plan-rules.service';
import { WhatsAppTokenService } from './whatsapp-token.service';
import { WhatsAppRoutingService } from './whatsapp-routing.service';

@Injectable()
export class WhatsAppSender {
  private readonly apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WhatsAppLogger,
    private readonly phoneNumbersService: WhatsAppPhoneNumbersService,
    private readonly planRulesService: PlanRulesService,
    private readonly tokenService: WhatsAppTokenService,
    private readonly routingService: WhatsAppRoutingService,
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
   * Map notification type to phone number purpose
   *
   * NOTE: Core notifications (WELCOME, REMINDER, BILLING) are always-on.
   * Only premium automation (WHATSAPP_ALERTS_AUTOMATION) requires feature gating.
   */
  private mapFeatureToPurpose(
    notificationType: string,
  ): WhatsAppPhoneNumberPurpose {
    const mapping: Record<string, WhatsAppPhoneNumberPurpose> = {
      WELCOME: 'DEFAULT',
      BILLING: 'BILLING',
      REMINDER: 'REMINDER',
      PAYMENT_DUE: 'BILLING',
    };
    return mapping[notificationType] || 'DEFAULT';
  }

  async sendTemplateMessage(
    tenantId: string,
    notificationType: string, // Core notifications (WELCOME, REMINDER, BILLING) or premium feature
    phone: string,
    templateName: string,
    parameters: string[],
    options?: {
      skipPlanCheck?: boolean;
      logId?: string;
      whatsAppNumberId?: string;
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
    const forceWhatsAppNumberId = options?.whatsAppNumberId;
    
    // 🛡️ SANITIZE FEATURE:
    // If 'notificationType' is just a random string (like a template name 'invoice_created...'),
    // it won't match any enum. We must map it to a valid Feature or Core Type.
    let feature = notificationType as WhatsAppFeature;

    const validFeatures = Object.values(WhatsAppFeature);
    const coreTypes = ['WELCOME', 'BILLING', 'REMINDER', 'PAYMENT_DUE', 'OTP'];

    if (!validFeatures.includes(feature) && !coreTypes.includes(notificationType)) {
        // Fallback: If it looks like a template key (not a feature), treat as UTILITY
        feature = WhatsAppFeature.WHATSAPP_UTILITY;
    }

    // Declare early for closure access in logFailure
    let phoneNumberConfig: any;


    const updateLogStatus = async (
      status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'SKIPPED',
      data?: { error?: string | null; messageId?: string | null },
    ) => {
      if (!logId) return;

      await this.prisma.whatsAppLog.update({
        where: { id: logId, tenantId },
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
          whatsAppNumberId: phoneNumberConfig?.id,
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

    // List of Core Notifications that are ALWAYS allowed (subject to quotas)
    // regardless of strict feature gating.
    const CORE_NOTIFICATIONS = [
      'WELCOME',
      'BILLING',
      'REMINDER',
      'PAYMENT_DUE',
    ];

    if (!isLegacyOrTrial && !skipPlanCheck) {
      // 🔒 GATE: Check if tenant has the specific feature entitlement
      // EXCEPTION: Core notifications remain available to all active plans
      // Check both original notificationType AND sanitized feature
      if (CORE_NOTIFICATIONS.includes(notificationType) || CORE_NOTIFICATIONS.includes(feature)) {
         // Allow core notification to proceed to quota checks
      } else {
        const hasEntitlement = planRules.features.includes(feature);

        if (!hasEntitlement) {
          return logFailure(
            `Plan missing feature: ${feature}`,
            true,
            'Plan missing feature',
          );
        }
      }
    }

    // 🔍 GUARDRAIL 2: QUOTA ENFORCEMENT (Generic)
    // Supports Daily (Trial) and Monthly (Pro/Standard) limits
    // Supports separated Utility vs Marketing quotas

    // Determine category and relevant quota
    let categoryLimit = 0;
    let categoryName = 'utility'; // Default for counting

    if (notificationType === 'WHATSAPP_CAMPAIGN_MARKETING') {
      categoryLimit = planRules?.whatsapp?.marketingQuota ?? 0;
      categoryName = 'marketing';
    } else {
      // All other types (REMINDER, OTP, BILLING, WELCOME) count as UTILITY
      categoryLimit = planRules?.whatsapp?.utilityQuota ?? 0;
      categoryName = 'utility';
    }

    // fallback: if specific quotas are 0/undefined but total > 0, use total (legacy/fallback)
    if (
      categoryLimit === 0 &&
      (planRules?.whatsapp?.messageQuota ?? 0) > 0 &&
      categoryName === 'utility'
    ) {
      categoryLimit = planRules!.whatsapp!.messageQuota;
    }

    if (categoryLimit > 0) {
      const isDaily = planRules?.whatsapp?.isDaily ?? false;
      const now = new Date();
      const periodStart = new Date(now);

      if (isDaily) {
        periodStart.setHours(0, 0, 0, 0); // Start of today
      } else {
        periodStart.setDate(1); // Start of this month
        periodStart.setHours(0, 0, 0, 0);
      }

      // Count usage for this category in the period
      // We need to query WhatsAppDailyUsage table for aggregated stats
      // OR WhatsAppLog for granular count. DailyUsage is better for performance.
      const aggregate = await this.prisma.whatsAppDailyUsage.aggregate({
        where: {
          tenantId,
          date: { gte: periodStart },
        },
        _sum: {
          [categoryName]: true,
        },
      });

      const used = aggregate._sum[categoryName] ?? 0;

      if (used >= categoryLimit) {
        const periodName = isDaily ? 'daily' : 'monthly';
        return logFailure(
          `${categoryName.toUpperCase()} quota exceeded (${used}/${categoryLimit} ${periodName})`,
          true,
          `${categoryName} quota exceeded`,
        );
      }
    } else if (planRules && !skipPlanCheck && !isLegacyOrTrial) {
      // If quota is 0 and it's a restricted plan, block.
      // (Trial/Legacy are handled by isLegacyOrTrial check above, but here we cover explicit 0 limits)
      return logFailure(
        `No ${categoryName} quota available for this plan`,
        true,
        `No ${categoryName} quota`,
      );
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
    // 2️⃣ Get Dynamic Phone Number from DB
    // ─────────────────────────────

    // 2a. Resolve phone number
    // PRIORITY: Use forced ID if provided (e.g. reply to specific number)
    try {
      if (forceWhatsAppNumberId) {
        phoneNumberConfig = await this.phoneNumbersService.getPhoneNumberById(
          forceWhatsAppNumberId,
        );
        if (!phoneNumberConfig) {
          return logFailure(
            `Provided WhatsApp Number ID ${forceWhatsAppNumberId} not found or disabled.`,
          );
        }
      } else {
        // FALLBACK: Use Purpose & Routing Logic
        const purpose = this.mapFeatureToPurpose(feature);

        // 2b. Dual-Track Routing Check (Only relevant if not forcing ID)
        // Use the actual notification type for routing, not hardcoded 'MANUAL'
        const routing = await this.routingService.resolveTrack(
          tenantId,
          notificationType,
        );

        if (!routing.allowed) {
          return logFailure(
            `Message type '${notificationType}' blocked by routing (${routing.track})`,
            true,
            `Blocked by routing (${routing.track})`,
          );
        }

        // Pass routing track to ensure we don't fallback to system default if on Track B
        phoneNumberConfig =
          await this.phoneNumbersService.getPhoneNumberForPurpose(
            tenantId,
            purpose,
            routing.track,
          );
      }
    } catch (error) {
      return logFailure(
        `No active phone number found: ${error.message}`,
        true,
        `No active phone number: ${error.message}`,
      );
    }

    if (!phoneNumberConfig.isEnabled) {
      return logFailure(
        'Phone number is disabled',
        true,
        'Phone number disabled',
      );
    }

    // 🔒 GUARDRAIL 3: Setup Status Check (Must be ACTIVE)
    if (phoneNumberConfig.setupStatus !== 'ACTIVE') {
      return logFailure(
        `WhatsApp setup is pending or failed (Status: ${phoneNumberConfig.setupStatus})`,
        true,
        'Setup not active',
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
      planRules.maxMembers !== null &&
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
    // 7️⃣ SEND WHATSAPP (Cloud API) - Using Dynamic Phone Number ID + Isolated Token
    // ─────────────────────────────
    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberConfig.phoneNumberId}/messages`;
    const resolvedToken =
      await this.tokenService.resolveToken(phoneNumberConfig);

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
            Authorization: `Bearer ${resolvedToken}`,
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
          whatsAppNumberId: phoneNumberConfig.id,
          memberId: null, // pass memberId later if needed
          phone: whatsappFormattedPhone,
          type: feature,
          status: 'SENT',
          messageId,
          metadata,
        });
      }

      // ✅ TRACK USAGE
      // Determine category based on notificationType / Feature
      let category: 'authentication' | 'marketing' | 'utility' | 'service' =
        'utility';

      if (notificationType === 'WHATSAPP_CAMPAIGN_MARKETING') {
        category = 'marketing';
      } else if (notificationType === 'OTP') {
        category = 'authentication';
      } else {
        category = 'utility';
      }

      await this.incrementUsage(tenantId, category);

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
          whatsAppNumberId: phoneNumberConfig?.id,
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

  /**
   * Helper to increment usage stats
   */
  private async incrementUsage(
    tenantId: string,
    category: 'marketing' | 'utility' | 'service' | 'authentication',
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      await this.prisma.whatsAppDailyUsage.upsert({
        where: {
          tenantId_date: {
            tenantId,
            date: today,
          },
        },
        create: {
          tenantId,
          date: today,
          [category]: 1,
        },
        update: {
          [category]: { increment: 1 },
        },
      });
    } catch (error) {
      console.error(
        `[WhatsAppSender] Failed to track usage for tenant ${tenantId}:`,
        error,
      );
      // Don't block sending if tracking fails, but log it.
    }
  }

  /**
   * Send a FREE TEXT message (Session Message)
   * Intended for MANUAL staff replies or session-based interactions.
   * Skips strict feature entitlement checks (assumes basic manual reply capability).
   */
  async sendTextMessage(
    tenantId: string,
    phone: string,
    text: string,
    whatsAppNumberId?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    // 1. Basic Plan/Settings Check (Minimal)
    const module = await this.resolveTenantModule(tenantId);
    const planRules = await this.planRulesService.getPlanRulesForTenant(
      tenantId,
      module,
    );
    // If plan is strictly disabled, block. But if trial/legacy, allow.
    if (planRules && !planRules.enabled) {
      return { success: false, error: 'Subscription plan disabled' };
    }

    // 2. Resolve Phone Number (DEFAULT purpose for manual replies)
    let phoneNumberConfig;
    try {
      if (whatsAppNumberId) {
        phoneNumberConfig =
          await this.phoneNumbersService.getPhoneNumberById(whatsAppNumberId);
        if (!phoneNumberConfig) {
          throw new Error(
            `Provided WhatsApp Number ID ${whatsAppNumberId} not found or disabled.`,
          );
        }
      } else {
        phoneNumberConfig =
          await this.phoneNumbersService.getPhoneNumberForPurpose(
            tenantId,
            'DEFAULT',
          );
      }
    } catch (e) {
      this.logger.log({
        tenantId,
        memberId: null,
        phone,
        type: 'MANUAL',
        status: 'FAILED',
        error: 'No phone number config',
        whatsAppNumberId, // Log the requested ID if any
      });
      return { success: false, error: 'No phone number provided' };
    }

    if (!phoneNumberConfig?.isEnabled) {
      return { success: false, error: 'Phone number inactive/disabled' };
    }

    // 3. Prepare & Send
    const normalizedPhone = normalizePhone(phone);
    let whatsappFormattedPhone: string;
    try {
      whatsappFormattedPhone = toWhatsAppPhone(normalizedPhone);
    } catch (e) {
      return { success: false, error: 'Invalid phone format' };
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberConfig.phoneNumberId}/messages`;
    const resolvedToken =
      await this.tokenService.resolveToken(phoneNumberConfig);

    try {
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: whatsappFormattedPhone,
          type: 'text',
          text: { preview_url: false, body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${resolvedToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const messageId = response.data?.messages?.[0]?.id;

      // 4. Log Success
      await this.prisma.whatsAppLog.create({
        data: {
          tenantId,
          whatsAppNumberId: phoneNumberConfig.id,
          phone: whatsappFormattedPhone,
          type: 'MANUAL', // Explicit type for staff replies
          status: 'SENT',
          messageId,
          metadata: { text_snippet: text.substring(0, 50) },
        },
      });

      // 5. Track Usage (Service)
      await this.incrementUsage(tenantId, 'service');

      return { success: true, messageId };
    } catch (error) {
      const errMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;

      await this.prisma.whatsAppLog.create({
        data: {
          tenantId,
          whatsAppNumberId: phoneNumberConfig?.id,
          phone: whatsappFormattedPhone,
          type: 'MANUAL',
          status: 'FAILED',
          error: errMsg,
        },
      });

      console.error('[WA TEXT ERROR]', errMsg);
      return { success: false, error: errMsg };
    }
  }
}
