import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ModuleType, WhatsAppPhoneNumberPurpose } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SubscriptionsService } from '../../core/billing/subscriptions/subscriptions.service';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppPhoneNumbersService } from './phone-numbers/whatsapp-phone-numbers.service';
import { PlanRulesService } from '../../core/billing/plan-rules.service';
import {
  CreateWhatsAppCampaignDto,
  ScheduleWhatsAppCampaignDto,
  SendWhatsAppMessageDto,
  WhatsAppLogsQueryDto,
} from './dto/whatsapp-user.dto';
import { WhatsAppFeature } from '../../core/billing/whatsapp-rules';

type WhatsAppTemplateCategory = 'UTILITY' | 'MARKETING';

export type WhatsAppPlanFeatures = {
  manualMessaging?: boolean;
  bulkCampaign?: boolean;
  automation?: boolean;
  reports?: boolean;
  monthlyQuota?: number;
};

type WhatsAppCampaignRecord = {
  id: string;
  tenantId: string;
  status: string;
  scheduledAt?: Date | null;
};

type WhatsAppCampaignClient = {
  count: (args: { where?: Record<string, unknown> }) => Promise<number>;
  create: (args: {
    data: Record<string, unknown>;
  }) => Promise<WhatsAppCampaignRecord>;
  findUnique: (args: {
    where: { id: string };
  }) => Promise<WhatsAppCampaignRecord | null>;
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<WhatsAppCampaignRecord>;
};

@Injectable()
export class WhatsAppUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly sender: WhatsAppSender,
    private readonly phoneNumbersService: WhatsAppPhoneNumbersService,
    private readonly planRulesService: PlanRulesService,
  ) {}

  private getCampaignClient(): WhatsAppCampaignClient {
    const prismaWithCampaign = this.prisma as unknown as {
      whatsAppCampaign?: WhatsAppCampaignClient;
    };

    if (!prismaWithCampaign.whatsAppCampaign) {
      throw new NotFoundException('WhatsApp campaign model not available');
    }

    return prismaWithCampaign.whatsAppCampaign;
  }

  private async getActiveCampaignCount(tenantId: string) {
    try {
      const campaignClient = this.getCampaignClient();
      return await campaignClient.count({
        where: {
          tenantId,
          status: { in: ['DRAFT', 'SCHEDULED', 'RUNNING'] },
        },
      });
    } catch {
      return 0;
    }
  }

  private async resolveTenantModule(tenantId: string): Promise<ModuleType> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantType: true },
    });

    if (!tenant?.tenantType) {
      throw new NotFoundException('Tenant not found');
    }

    const normalized = tenant.tenantType.toUpperCase();
    if (normalized === 'GYM') return ModuleType.GYM;
    if (normalized === 'BUSINESS' || normalized === 'MOBILE_SHOP')
      return ModuleType.MOBILE_SHOP;
    return ModuleType.MOBILE_SHOP; // Default
  }

  /**
   * Derive permissions capabilities from PLAN FEATURES (Relational)
   *
   * NOTE: Core WhatsApp notifications are always-on.
   * Only WHATSAPP_ALERTS_AUTOMATION (premium) enables advanced features.
   */
  private deriveFeaturesFromRules(
    features: WhatsAppFeature[],
  ): WhatsAppPlanFeatures {
    const hasAutomation = features.includes(
      WhatsAppFeature.WHATSAPP_ALERTS_AUTOMATION,
    );
    const hasReports = features.includes(WhatsAppFeature.REPORTS);

    return {
      manualMessaging: true, // Always available (core feature)
      bulkCampaign: hasAutomation, // Premium
      automation: hasAutomation, // Premium
      reports: hasReports, // Premium
      monthlyQuota: undefined, // Use PlanLimits instead
    };
  }

  private async getSubscriptionContext(tenantId: string) {
    // 1. Try to find an active WHATSAPP_CRM (Standalone) subscription first
    let subscription =
      await this.subscriptionsService.getCurrentActiveSubscription(
        tenantId,
        ModuleType.WHATSAPP_CRM,
      );

    let effectiveModule: ModuleType = ModuleType.WHATSAPP_CRM;

    // 2. Fallback: If no standalone CRM sub, resolve the Core Module (Gym/Shop)
    if (!subscription?.plan) {
      effectiveModule = await this.resolveTenantModule(tenantId);
      const primarySub =
        await this.subscriptionsService.getCurrentActiveSubscription(
          tenantId,
          effectiveModule,
        );

      // 3. Check if primary sub has a WHATSAPP_CRM addon
      if (primarySub?.addons) {
        const whatsappAddon = primarySub.addons.find(
          (a: any) =>
            a.addonPlan.module === ModuleType.WHATSAPP_CRM &&
            a.status === 'ACTIVE',
        );
        if (whatsappAddon) {
          subscription = primarySub;
          effectiveModule = ModuleType.WHATSAPP_CRM;
        }
      }
    }

    if (!subscription?.plan) {
      throw new ForbiddenException('PLAN_REQUIRED');
    }

    // 4. Get Rules
    // NOTE: This will fetch rules for the primary module (GYM/SHOP).
    // The PlanRulesService should ideally merge addon features.
    const rules = await this.planRulesService.getPlanRulesForTenant(
      tenantId,
      effectiveModule,
    );

    const featureList = rules?.features || [];
    const features = this.deriveFeaturesFromRules(featureList);

    return {
      subscription,
      features,
    };
  }

  private async ensureFeature(
    tenantId: string,
    feature: keyof WhatsAppPlanFeatures,
  ) {
    const { features } = await this.getSubscriptionContext(tenantId);
    if (!features[feature]) {
      throw new ForbiddenException('FEATURE_NOT_ALLOWED');
    }
    return features;
  }

  private getMonthRange(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private getQuotaDateRange(isDaily: boolean, date = new Date()) {
    if (isDaily) {
      // For Trial: Reset daily at midnight
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else {
      // For Paid: Reset monthly (start of calendar month)
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }

  /**
   * Calculate ACTIVE add-on quota for the current month.
   */
  private async getAddonQuota(
    tenantId: string,
    category: WhatsAppTemplateCategory,
  ): Promise<number> {
    const { start, end } = this.getMonthRange();

    // 1. Find valid add-on payments for this month
    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        status: 'SUCCESS',
        createdAt: { gte: start, lte: end },
      },
      select: { planId: true },
    });

    if (payments.length === 0) return 0;

    const planIds = [...new Set(payments.map((p) => p.planId))];
    const plans = await this.prisma.plan.findMany({
      where: {
        id: { in: planIds },
        isAddon: true,
      },
      select: { id: true, meta: true },
    });

    const planMap = new Map(plans.map((p) => [p.id, p]));

    let totalAddonQuota = 0;

    for (const payment of payments) {
      const plan = planMap.get(payment.planId);
      if (!plan || !plan.meta) continue;

      const meta = plan.meta as any;
      const quota = meta.quota?.[category.toLowerCase()] ?? 0;
      totalAddonQuota += quota;
    }

    return totalAddonQuota;
  }

  private async getCategoryUsage(
    tenantId: string,
    category: WhatsAppTemplateCategory,
    isDaily: boolean,
  ) {
    const { start, end } = this.getQuotaDateRange(isDaily);

    return this.prisma.whatsAppLog.count({
      where: {
        tenantId,
        sentAt: { gte: start, lte: end },
        status: { not: 'SKIPPED' },
        metadata: {
          path: ['templateCategory'],
          equals: category,
        },
      },
    });
  }

  private async ensureQuotaAvailable(
    tenantId: string,
    planCode: string,
    category: WhatsAppTemplateCategory,
  ) {
    // ── PRIMARY: DB-driven plan rules (includes add-on merging) ──
    const module = await this.resolveTenantModule(tenantId);
    const planRules = await this.planRulesService.getPlanRulesForTenant(
      tenantId,
      module,
    );
    const limits = planRules?.whatsapp;
    if (!limits) return;

    const baseLimit = limits.messageQuota ?? 0;

    // Fetch Add-on Quotas (Sum of all categories if they are category-specific in DB,
    // but effectively they add to the global pool in this new model)
    const [utilityAddon, marketingAddon] = await Promise.all([
      this.getAddonQuota(tenantId, 'UTILITY'),
      this.getAddonQuota(tenantId, 'MARKETING'),
    ]);
    const totalAddonLimit = utilityAddon + marketingAddon;
    const totalLimit = baseLimit + totalAddonLimit;

    // Block if total limit is 0
    if (totalLimit <= 0) {
      throw new ForbiddenException(
        `Your plan (${planCode}) does not support WhatsApp messaging. Buy an Add-on Pack to enable.`,
      );
    }

    const isDaily = limits.isDaily ?? false;

    // Check TOTAL usage (Shared Pool)
    const [utilityUsed, marketingUsed] = await Promise.all([
      this.getCategoryUsage(tenantId, 'UTILITY', isDaily),
      this.getCategoryUsage(tenantId, 'MARKETING', isDaily),
    ]);
    const totalUsed = utilityUsed + marketingUsed;

    if (totalUsed >= totalLimit) {
      const period = isDaily ? 'today' : 'this month';
      throw new ForbiddenException(
        `WHATSAPP_QUOTA_EXCEEDED: You have reached your global message limit of ${totalLimit} messages for ${period}. Upgrade your plan to increase limits.`,
      );
    }
  }

  private async resolveWhatsAppNumberStatus(tenantId: string) {
    const setting = await this.prisma.whatsAppSetting.findUnique({
      where: { tenantId },
      select: { enabled: true },
    });

    // If setting exists and is explicitly disabled, return DISABLED
    if (setting && setting.enabled === false) {
      return 'DISABLED';
    }

    // Check if tenant has crm enabled flag true
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappCrmEnabled: true },
    });

    if (tenant && !tenant.whatsappCrmEnabled) {
      // If setup is not complete, we might still have a number but it's not "functionally connected" for CRM
      // But for health check purposes, we check the actual number table.
    }

    try {
      await this.phoneNumbersService.getPhoneNumberForPurpose(
        tenantId,
        WhatsAppPhoneNumberPurpose.DEFAULT,
        'TENANT_OWNED',
      );
      return 'CONNECTED';
    } catch {
      return 'DISCONNECTED';
    }
  }

  async getNumbers(tenantId: string) {
    return this.phoneNumbersService.getNumbers(tenantId);
  }

  async getDashboard(tenantId: string) {
    try {
      const { subscription, features } =
        await this.getSubscriptionContext(tenantId);

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const { start: monthStart, end: monthEnd } = this.getMonthRange();

      const [
        messagesSentToday,
        messagesSentThisMonth,
        deliveredCount,
        readCount,
        failedCount,
        activeCampaignCount,
        whatsappNumberStatus,
      ] = await Promise.all([
        this.prisma.whatsAppLog.count({
          where: {
            tenantId,
            sentAt: { gte: startOfDay, lte: endOfDay },
            status: { not: 'SKIPPED' },
          },
        }),
        this.prisma.whatsAppLog.count({
          where: {
            tenantId,
            sentAt: { gte: monthStart, lte: monthEnd },
            status: { not: 'SKIPPED' },
          },
        }),
        this.prisma.whatsAppLog.count({
          where: {
            tenantId,
            sentAt: { gte: monthStart, lte: monthEnd },
            status: 'DELIVERED',
          },
        }),
        this.prisma.whatsAppLog.count({
          where: {
            tenantId,
            sentAt: { gte: monthStart, lte: monthEnd },
            status: 'READ',
          },
        }),
        this.prisma.whatsAppLog.count({
          where: {
            tenantId,
            sentAt: { gte: monthStart, lte: monthEnd },
            status: 'FAILED',
          },
        }),
        this.getActiveCampaignCount(tenantId),
        this.resolveWhatsAppNumberStatus(tenantId),
      ]);

      const monthlyQuota = features.monthlyQuota ?? null;
      const usedQuota = messagesSentThisMonth;
      const remainingQuota =
        monthlyQuota && monthlyQuota > 0
          ? Math.max(monthlyQuota - usedQuota, 0)
          : null;

      return {
        messagesSentToday,
        messagesSentThisMonth,
        deliveredCount,
        readCount,
        failedCount,
        activeCampaignCount,
        whatsappNumberStatus,
        planName: subscription.plan.name,
        planExpiry: subscription.endDate,
        monthlyQuota,
        usedQuota,
        remainingQuota,
        features,
      };
    } catch (error: any) {
      // If plan is required, return a 200 with upgrade message instead of throwing 403
      if (error?.message === 'PLAN_REQUIRED') {
        return {
          planRequired: true,
          message: 'WhatsApp module requires an active subscription plan',
          messagesSentToday: 0,
          messagesSentThisMonth: 0,
          deliveredCount: 0,
          readCount: 0,
          failedCount: 0,
          activeCampaignCount: 0,
          whatsappNumberStatus: null,
          planName: null,
          planExpiry: null,
          monthlyQuota: 0,
          usedQuota: 0,
          remainingQuota: 0,
          features: [],
        };
      }
      throw error; // Re-throw other errors
    }
  }

  async sendMessage(tenantId: string, dto: SendWhatsAppMessageDto) {
    const { subscription, features } =
      await this.getSubscriptionContext(tenantId);

    if (!features.manualMessaging) {
      throw new ForbiddenException('FEATURE_MANUAL_MESSAGING_DISABLED');
    }

    await this.phoneNumbersService.getPhoneNumberForPurpose(
      tenantId,
      WhatsAppPhoneNumberPurpose.DEFAULT,
    );

    const planCode = subscription?.plan?.code ?? subscription?.plan?.name;

    // ---------------------------------------------------------
    // A. FREE TEXT FLOW (Manual Reply / Staff) -> UTILITY
    // ---------------------------------------------------------
    if (dto.text) {
      await this.ensureQuotaAvailable(tenantId, planCode, 'UTILITY');

      // Get default WhatsAppNumber for tenant
      const defaultNumber = await this.prisma.whatsAppNumber.findFirst({
        where: { tenantId, isDefault: true },
        select: { id: true },
      });

      if (!defaultNumber) {
        throw new BadRequestException('No default WhatsApp number configured');
      }

      // 1. Create Log Entry (MANUAL)
      const log = await this.prisma.whatsAppLog.create({
        data: {
          tenantId,
          whatsAppNumberId: defaultNumber.id,
          phone: dto.phone,
          type: 'MANUAL',
          status: 'QUEUED',
          metadata: {
            text_snippet: dto.text.substring(0, 50),
            campaignId: dto.campaignId ?? null,
            templateCategory: 'UTILITY', // Explicitly mark checks
          },
        },
      });

      // 2. Send Text Message
      const result = await this.sender.sendTextMessage(
        tenantId,
        dto.phone,
        dto.text,
      );

      // 3. Update Log Status
      if (result.success && result.messageId) {
        await this.prisma.whatsAppLog.update({
          where: { id: log.id },
          data: { status: 'SENT', messageId: result.messageId },
        });
      } else {
        await this.prisma.whatsAppLog.update({
          where: { id: log.id },
          data: {
            status: 'FAILED',
            error: result.error
              ? JSON.stringify(result.error)
              : 'Unknown error',
          },
        });
      }

      return this.prisma.whatsAppLog.findFirst({
        where: { id: log.id, tenantId },
      });
    }

    // ---------------------------------------------------------
    // B. TEMPLATE FLOW (Legacy / System)
    // ---------------------------------------------------------
    if (!dto.templateId) {
      throw new BadRequestException(
        'Either text or templateId must be provided',
      );
    }

    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: {
        id: dto.templateId,
        status: { in: ['ACTIVE', 'APPROVED'] },
      },
    });

    if (!template) {
      throw new BadRequestException('Template not approved');
    }

    const templateCategory = (
      template.category === 'MARKETING' ? 'MARKETING' : 'UTILITY'
    ) as WhatsAppTemplateCategory;

    await this.ensureQuotaAvailable(tenantId, planCode, templateCategory);

    // Get default WhatsAppNumber for tenant
    const defaultNumber = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId, isDefault: true },
      select: { id: true },
    });

    if (!defaultNumber) {
      throw new BadRequestException('No default WhatsApp number configured');
    }

    const log = await this.prisma.whatsAppLog.create({
      data: {
        tenantId,
        whatsAppNumberId: defaultNumber.id,
        phone: dto.phone,
        type: 'MANUAL',
        status: 'QUEUED',
        metadata: {
          templateName: template.metaTemplateName,
          templateKey: template.templateKey,
          campaignId: dto.campaignId ?? null,
          templateCategory,
        },
      },
    });

    const manualFeature = 'MANUAL' as unknown as WhatsAppFeature;
    const result = await this.sender.sendTemplateMessage(
      tenantId,
      manualFeature,
      dto.phone,
      template.metaTemplateName,
      dto.parameters ?? [],
      {
        skipPlanCheck: true,
        logId: log.id,
        metadata: {
          templateName: template.metaTemplateName,
          templateKey: template.templateKey,
          campaignId: dto.campaignId ?? null,
          templateCategory,
        },
      },
    );

    if (!result.success && !result.error) {
      await this.prisma.whatsAppLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: result.reason ?? 'Unknown error' },
      });
    }

    return this.prisma.whatsAppLog.findFirst({
      where: { id: log.id, tenantId },
    });
  }

  async createCampaign(
    tenantId: string,
    dto: CreateWhatsAppCampaignDto,
  ): Promise<WhatsAppCampaignRecord> {
    await this.ensureFeature(tenantId, 'bulkCampaign');

    // 🔥 LIVE LIMIT ENFORCEMENT (Downgrade Bypass Protection)
    const module = await this.resolveTenantModule(tenantId);
    await this.planRulesService.checkRuntimeLimits(tenantId, module);

    const template = await this.prisma.whatsAppTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    const campaignClient = this.getCampaignClient();
    return campaignClient.create({
      data: {
        tenantId,
        name: dto.name,
        templateId: template.id,
        templateName: template.metaTemplateName,
        status: 'DRAFT',
        filters: dto.filters ?? undefined,
      },
    });
  }

  async scheduleCampaign(
    tenantId: string,
    campaignId: string,
    dto: ScheduleWhatsAppCampaignDto,
  ): Promise<WhatsAppCampaignRecord> {
    await this.ensureFeature(tenantId, 'bulkCampaign');

    const campaignClient = this.getCampaignClient();
    const campaign = await campaignClient.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.tenantId !== tenantId) {
      throw new NotFoundException('Campaign not found');
    }

    return campaignClient.update({
      where: { id: campaignId },
      data: {
        status: 'SCHEDULED',
        scheduledAt: new Date(dto.scheduledAt),
      },
    });
  }

  async getLogs(tenantId: string, query: WhatsAppLogsQueryDto) {
    await this.ensureFeature(tenantId, 'manualMessaging');

    const where: Prisma.WhatsAppLogWhereInput = {
      tenantId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      const start = query.startDate ? new Date(query.startDate) : undefined;
      const end = query.endDate ? new Date(query.endDate) : undefined;

      where.sentAt = {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      };
    }

    if (query.campaignId) {
      where.metadata = {
        path: ['campaignId'],
        equals: query.campaignId,
      } as Prisma.JsonFilter;
    }

    if (query.whatsAppNumberId) {
      where.whatsAppNumberId = query.whatsAppNumberId;
    }

    // 🔥 Build sort order
    const orderBy: Prisma.WhatsAppLogOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'sentAt';
    const sortOrder = query.sortOrder || 'desc';

    if (sortField === 'sentAt' || sortField === 'readAt') {
      orderBy[sortField] = sortOrder;
    } else {
      orderBy.sentAt = sortOrder;
    }

    // 🔥 Get total count for pagination
    const total = await this.prisma.whatsAppLog.count({ where });

    // 🔥 Fetch paginated data
    const data = await this.prisma.whatsAppLog.findMany({
      where,
      orderBy,
      skip: query.skip || 0,
      take: query.take || 50,
    });

    // 🔥 Return paginated response
    return {
      data,
      pagination: {
        total,
        page: Math.floor((query.skip || 0) / (query.take || 50)) + 1,
        limit: query.take || 50,
        totalPages: Math.ceil(total / (query.take || 50)),
        hasNext: (query.skip || 0) + (query.take || 50) < total,
        hasPrevious: (query.skip || 0) > 0,
      },
    };
  }
  async getUsageSummary(tenantId: string) {
    const { subscription, features } =
      await this.getSubscriptionContext(tenantId);

    const planCode = subscription?.plan?.code ?? subscription?.plan?.name;

    // ── PRIMARY: DB-driven plan rules ──
    const module = await this.resolveTenantModule(tenantId);
    const planRules = await this.planRulesService.getPlanRulesForTenant(
      tenantId,
      module,
    );
    const limits = planRules?.whatsapp ?? { messageQuota: 0 };
    const isDaily = limits.isDaily ?? false;

    // Get Usage
    const [utilityUsed, marketingUsed] = await Promise.all([
      this.getCategoryUsage(tenantId, 'UTILITY', isDaily),
      this.getCategoryUsage(tenantId, 'MARKETING', isDaily),
    ]);

    // Fetch Add-on Quotas
    const [utilityAddon, marketingAddon] = await Promise.all([
      this.getAddonQuota(tenantId, 'UTILITY'),
      this.getAddonQuota(tenantId, 'MARKETING'),
    ]);

    // Calculate Reset Date
    const { end } = this.getQuotaDateRange(isDaily);
    const resetAt = new Date(end.getTime() + 1); // Start of next period

    const sharedBaseLimit = limits.messageQuota ?? 0;

    return {
      plan: planCode,
      module: subscription.module,
      // Shared Pool Representation
      utility: {
        used: utilityUsed,
        baseLimit: sharedBaseLimit, // Shared
        addonLimit: utilityAddon,
        totalLimit: sharedBaseLimit + utilityAddon + marketingAddon, // Shared pool
      },
      marketing: {
        used: marketingUsed,
        baseLimit: sharedBaseLimit, // Shared
        addonLimit: marketingAddon,
        totalLimit: sharedBaseLimit + utilityAddon + marketingAddon, // Shared pool
      },
      // If daily, it resets tomorrow. If monthly, next month.
      resetAt: resetAt.toISOString(),
      isTrial: isDaily,
    };
  }
}
