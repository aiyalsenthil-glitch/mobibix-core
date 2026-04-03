import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppFeature } from '../../core/billing/whatsapp-rules';
import { toWhatsAppPhone, normalizePhone } from '../../common/utils/phone.util';
import { WhatsAppLogger } from './whatsapp.logger';
import { WhatsAppPhoneNumbersService } from './phone-numbers/whatsapp-phone-numbers.service';
import { WhatsAppPhoneNumberPurpose, ModuleType } from '@prisma/client';
import { PlanRulesService } from '../../core/billing/plan-rules.service';
import { WhatsAppRoutingService } from './whatsapp-routing.service';
import { ProviderManager } from './providers/provider-manager.service';

@Injectable()
export class WhatsAppSender {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WhatsAppLogger,
    private readonly phoneNumbersService: WhatsAppPhoneNumbersService,
    private readonly planRulesService: PlanRulesService,
    private readonly routingService: WhatsAppRoutingService,
    private readonly providerManager: ProviderManager,
  ) {}

  /**
   * Returns the WhatsAppNumber ID to use for owner notifications.
   * Respects `notificationSource`: OWN_NUMBER → tenant's META_CLOUD number, else undefined (platform default).
   */
  async resolveNotificationNumberId(tenantId: string): Promise<string | undefined> {
    const config = await this.prisma.whatsAppBotConfig.findUnique({
      where: { tenantId },
      select: { notificationSource: true },
    });
    if (config?.notificationSource !== 'OWN_NUMBER') return undefined;
    const ownNumber = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId, provider: 'META_CLOUD', isEnabled: true },
      select: { id: true },
    });
    return ownNumber?.id ?? undefined;
  }

  private async resolveTenantModule(tenantId: string): Promise<ModuleType> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantType: true },
    });
    if (!tenant?.tenantType) return ModuleType.MOBILE_SHOP;
    return tenant.tenantType.toUpperCase() === 'GYM'
      ? ModuleType.GYM
      : ModuleType.MOBILE_SHOP;
  }

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
    notificationType: string,
    phone: string,
    templateName: string,
    parameters: string[],
    options?: {
      skipPlanCheck?: boolean;
      logId?: string;
      whatsAppNumberId?: string;
      metadata?: Record<string, any> | null;
      buttonUrlSuffix?: string;
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

    let feature = notificationType as WhatsAppFeature;
    const validFeatures = Object.values(WhatsAppFeature);
    const coreTypes = ['WELCOME', 'BILLING', 'REMINDER', 'PAYMENT_DUE', 'OTP'];

    if (!validFeatures.includes(feature) && !coreTypes.includes(notificationType)) {
      feature = WhatsAppFeature.WHATSAPP_UTILITY;
    }

    let phoneNumberConfig: any;

    const updateLogStatus = async (
      status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'SKIPPED',
      data?: { error?: string | null; messageId?: string | null; providerUsed?: string; messageCost?: number },
    ) => {
      if (!logId) return;
      await this.prisma.whatsAppLog.update({
        where: { id: logId, tenantId },
        data: {
          status,
          error: data?.error ?? undefined,
          messageId: data?.messageId ?? undefined,
          providerUsed: data?.providerUsed ?? undefined,
          messageCost: data?.messageCost ?? undefined,
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
      return { success: false, skipped, reason, error: errorMessage };
    };

    // ── GUARDRAIL 1: Plan / Feature gate ─────────────────────────────────────
    const module = await this.resolveTenantModule(tenantId);
    const planRules = await this.planRulesService.getPlanRulesForTenant(tenantId, module);
    const isLegacyOrTrial = !planRules || !planRules.features || planRules.features.length === 0;
    const CORE_NOTIFICATIONS = ['WELCOME', 'BILLING', 'REMINDER', 'PAYMENT_DUE'];

    if (!isLegacyOrTrial && !skipPlanCheck) {
      if (!CORE_NOTIFICATIONS.includes(notificationType) && !CORE_NOTIFICATIONS.includes(feature)) {
        if (!planRules.features.includes(feature)) {
          return logFailure(`Plan missing feature: ${feature}`, true, 'Plan missing feature');
        }
      }
    }

    // ── GUARDRAIL 2: Quota enforcement ────────────────────────────────────────
    let categoryLimit = 0;
    let categoryName = 'utility';

    if (notificationType === 'WHATSAPP_CAMPAIGN_MARKETING') {
      categoryLimit = planRules?.whatsapp?.marketingQuota ?? 0;
      categoryName = 'marketing';
    } else {
      categoryLimit = planRules?.whatsapp?.utilityQuota ?? 0;
    }

    if (categoryLimit === 0 && (planRules?.whatsapp?.messageQuota ?? 0) > 0 && categoryName === 'utility') {
      categoryLimit = planRules!.whatsapp!.messageQuota;
    }

    if (categoryLimit > 0) {
      const isDaily = planRules?.whatsapp?.isDaily ?? false;
      const periodStart = new Date();
      periodStart.setHours(0, 0, 0, 0);
      if (!isDaily) periodStart.setDate(1);

      const aggregate = await this.prisma.whatsAppDailyUsage.aggregate({
        where: { tenantId, date: { gte: periodStart } },
        _sum: { [categoryName]: true },
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
      return logFailure(
        `No ${categoryName} quota available for this plan`,
        true,
        `No ${categoryName} quota`,
      );
    }

    // ── Phone normalization ───────────────────────────────────────────────────
    const normalizedPhone = normalizePhone(phone);
    let whatsappFormattedPhone: string;
    try {
      whatsappFormattedPhone = toWhatsAppPhone(normalizedPhone);
    } catch (error: any) {
      return logFailure(`Invalid phone format: ${error?.message || 'Unknown error'}`);
    }

    // ── Resolve phone number config ───────────────────────────────────────────
    try {
      if (forceWhatsAppNumberId) {
        phoneNumberConfig = await this.phoneNumbersService.getPhoneNumberById(forceWhatsAppNumberId);
        if (!phoneNumberConfig) {
          return logFailure(`WhatsApp Number ID ${forceWhatsAppNumberId} not found.`);
        }
      } else {
        const purpose = this.mapFeatureToPurpose(feature);
        const routing = await this.routingService.resolveTrack(tenantId, notificationType);

        if (!routing.allowed) {
          return logFailure(
            `Message type '${notificationType}' blocked by routing (${routing.track})`,
            true,
            `Blocked by routing (${routing.track})`,
          );
        }

        phoneNumberConfig = await this.phoneNumbersService.getPhoneNumberForPurpose(
          tenantId,
          purpose,
          routing.track,
        );
      }
    } catch (error) {
      return logFailure(`No active phone number found: ${error.message}`, true, `No active phone number`);
    }

    if (!phoneNumberConfig.isEnabled) {
      return logFailure('Phone number is disabled', true, 'Phone number disabled');
    }

    if (phoneNumberConfig.setupStatus !== 'ACTIVE') {
      return logFailure(
        `WhatsApp setup not active (Status: ${phoneNumberConfig.setupStatus})`,
        true,
        'Setup not active',
      );
    }

    if (planRules && !planRules.enabled) {
      return logFailure('Subscription plan disabled', true, 'Subscription plan disabled');
    }

    // ── Member limit ──────────────────────────────────────────────────────────
    const memberCount = await this.prisma.member.count({ where: { tenantId } });
    if (planRules?.maxMembers && planRules.maxMembers > 0 && memberCount > planRules.maxMembers) {
      return logFailure('Plan member limit exceeded', true, 'Plan member limit exceeded');
    }

    // ── SEND via ProviderManager ──────────────────────────────────────────────
    const result = await this.providerManager.sendTemplate(
      phoneNumberConfig,
      whatsappFormattedPhone,
      templateName,
      parameters,
      tenantId,
      { buttonUrlSuffix: options?.buttonUrlSuffix },
    );

    // Determine usage category
    let category: 'authentication' | 'marketing' | 'utility' | 'service' = 'utility';
    if (notificationType === 'WHATSAPP_CAMPAIGN_MARKETING') category = 'marketing';
    else if (notificationType === 'OTP') category = 'authentication';

    if (result.success) {
      if (logId) {
        await updateLogStatus('SENT', {
          messageId: result.messageId ?? null,
          providerUsed: result.providerName,
          messageCost: result.cost,
        });
      } else {
        await this.logger.log({
          tenantId,
          whatsAppNumberId: phoneNumberConfig.id,
          memberId: null,
          phone: whatsappFormattedPhone,
          type: feature,
          status: 'SENT',
          messageId: result.messageId,
          metadata: { ...(metadata || {}), providerUsed: result.providerName },
        });
      }
      await this.incrementUsage(tenantId, category, result.cost);
      return { success: true, messageId: result.messageId };
    } else {
      const errMsg = result.error || 'Unknown provider error';
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
      return { success: false, error: errMsg };
    }
  }

  async sendTextMessage(
    tenantId: string,
    phone: string,
    text: string,
    whatsAppNumberId?: string,
    isBot = false,
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    const module = await this.resolveTenantModule(tenantId);
    const planRules = await this.planRulesService.getPlanRulesForTenant(tenantId, module);
    if (planRules && !planRules.enabled) {
      return { success: false, error: 'Subscription plan disabled' };
    }

    let phoneNumberConfig: any;
    try {
      if (whatsAppNumberId) {
        phoneNumberConfig = await this.phoneNumbersService.getPhoneNumberById(whatsAppNumberId);
        if (!phoneNumberConfig) throw new Error(`WhatsApp Number ID ${whatsAppNumberId} not found.`);
      } else {
        phoneNumberConfig = await this.phoneNumbersService.getPhoneNumberForPurpose(tenantId, 'DEFAULT');
      }
    } catch (e: any) {
      this.logger.log({
        tenantId,
        memberId: null,
        phone,
        type: 'MANUAL',
        status: 'FAILED',
        error: 'No phone number config',
        whatsAppNumberId,
      });
      return { success: false, error: 'No phone number provided' };
    }

    if (!phoneNumberConfig?.isEnabled) {
      return { success: false, error: 'Phone number inactive/disabled' };
    }

    const normalizedPhone = normalizePhone(phone);
    let whatsappFormattedPhone: string;
    try {
      whatsappFormattedPhone = toWhatsAppPhone(normalizedPhone);
    } catch {
      return { success: false, error: 'Invalid phone format' };
    }

    const result = await this.providerManager.sendMessage(
      phoneNumberConfig,
      whatsappFormattedPhone,
      text,
      tenantId,
      { channel: 'WHATSAPP' },
    );

      if (result.success) {
        // Technical log
        await this.prisma.whatsAppLog.create({
          data: {
            tenantId,
            whatsAppNumberId: phoneNumberConfig.id,
            phone: whatsappFormattedPhone,
            type: 'MANUAL',
            status: 'SENT',
            messageId: result.messageId,
            providerUsed: result.providerName,
            messageCost: result.cost,
            metadata: {
              text_snippet: text.substring(0, 50),
              provider: result.providerName,
            },
          },
        });
        await this.incrementUsage(tenantId, 'service', result.cost);

        // Inbox log (for chat history)
        await (this.prisma as any).whatsAppMessageLog.create({
          data: {
            tenantId,
            phoneNumber: whatsappFormattedPhone,
            direction: 'OUTGOING',
            body: text,
            status: 'SENT',
            provider: phoneNumberConfig.provider === 'AUTHKEY' ? 'AUTHKEY' : 'META_CLOUD',
            whatsAppNumberId: phoneNumberConfig.id,
            metadata: { 
              source: isBot ? 'bot' : 'agent', 
              messageId: result.messageId 
            },
          },
        });

        // ── HUMAN HANDOVER: only pause bot when a real agent sends, not the bot itself ──
        if (!isBot) {
          await this.prisma.whatsAppConversationState.upsert({
            where: { tenantId_phoneNumber: { tenantId, phoneNumber: normalizedPhone } },
            update: { botPaused: true, agentActiveAt: new Date() },
            create: {
              tenantId,
              phoneNumber: normalizedPhone,
              step: 'AGENT_HANDOVER',
              botPaused: true,
              agentActiveAt: new Date(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
        }
        // ────────────────────────────────────────────────────────────────────

        return { success: true, messageId: result.messageId };
      } else {
      const errMsg = result.error || 'Unknown provider error';
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
      return { success: false, error: errMsg };
    }
  }

  /**
   * Send a WhatsApp or SMS message via Authkey.
   * Use this for direct SMS sends (not WhatsApp).
   */
  async sendSms(
    tenantId: string,
    phone: string,
    text: string,
    whatsAppNumberId?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    let phoneNumberConfig: any;
    try {
      if (whatsAppNumberId) {
        phoneNumberConfig = await this.phoneNumbersService.getPhoneNumberById(whatsAppNumberId);
        if (!phoneNumberConfig) throw new Error('Phone number not found');
      } else {
        phoneNumberConfig = await this.phoneNumbersService.getPhoneNumberForPurpose(tenantId, 'DEFAULT');
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }

    if (phoneNumberConfig.provider !== 'AUTHKEY') {
      return { success: false, error: 'SMS only supported for AUTHKEY provider numbers' };
    }

    const normalizedPhone = normalizePhone(phone);

    const result = await this.providerManager.sendMessage(
      phoneNumberConfig,
      normalizedPhone,
      text,
      tenantId,
      { channel: 'SMS' },
    );

    if (result.success) {
      await this.prisma.whatsAppLog.create({
        data: {
          tenantId,
          whatsAppNumberId: phoneNumberConfig.id,
          phone: normalizedPhone,
          type: 'SMS',
          status: 'SENT',
          channel: 'SMS',
          messageId: result.messageId,
          providerUsed: result.providerName,
          messageCost: result.cost,
        },
      });
    }

    return { success: result.success, messageId: result.messageId, error: result.error };
  }

  private async incrementUsage(
    tenantId: string,
    category: 'marketing' | 'utility' | 'service' | 'authentication',
    cost?: number,
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      await this.prisma.whatsAppDailyUsage.upsert({
        where: { tenantId_date: { tenantId, date: today } },
        create: {
          tenantId,
          date: today,
          [category]: 1,
          totalCost: cost ?? 0,
        },
        update: {
          [category]: { increment: 1 },
          totalCost: { increment: cost ?? 0 },
        },
      });
    } catch (error) {
      // WhatsAppLogger writes to DB — use process.stderr for this infra-level error
      process.stderr.write(`[WhatsAppSender] Usage tracking failed for tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
}
