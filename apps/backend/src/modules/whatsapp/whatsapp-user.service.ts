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
    if (normalized === 'MOBILE_SHOP') return ModuleType.WHATSAPP_CRM;
    return ModuleType.GYM;
  }

  /**
   * Derive permissions capabilities from PLAN FEATURES (Relational)
   * Replacing legacy JSON logic.
   */
  private deriveFeaturesFromRules(features: WhatsAppFeature[]): WhatsAppPlanFeatures {
    const hasBasic = features.includes(WhatsAppFeature.WHATSAPP_ALERTS_BASIC);
    const hasAll = features.includes(WhatsAppFeature.WHATSAPP_ALERTS_ALL);
    const hasReports = features.includes(WhatsAppFeature.REPORTS);

    // Hardcoded Limits for V1 (Frozen)
    // Basic = 100/mo, All = 1000/mo
    let monthlyQuota = 0;
    if (hasAll) monthlyQuota = 1000;
    else if (hasBasic) monthlyQuota = 100;

    return {
      manualMessaging: hasBasic || hasAll,
      bulkCampaign: hasAll,
      automation: hasAll,
      reports: hasReports || hasAll,
      monthlyQuota,
    };
  }

  private async getSubscriptionContext(tenantId: string) {
    const moduleType = await this.resolveTenantModule(tenantId);
    
    // 1. Get Subscription (for EndDate/PlanName)
    const subscription =
      await this.subscriptionsService.getCurrentActiveSubscription(
        tenantId,
        moduleType,
      );

    if (!subscription?.plan) {
      throw new ForbiddenException('PLAN_REQUIRED');
    }

    // 2. Get Rules (for Features - Source of Truth)
    const rules = await this.planRulesService.getPlanRulesForTenant(tenantId, moduleType);
    
    // Safe fallback if rules missing (shouldn't happen if subscription exists)
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

  private async getMonthlyUsage(tenantId: string) {
    const { start, end } = this.getMonthRange();

    return this.prisma.whatsAppLog.count({
      where: {
        tenantId,
        sentAt: { gte: start, lte: end },
        status: { not: 'SKIPPED' },
      },
    });
  }

  private async ensureQuotaAvailable(tenantId: string, monthlyQuota?: number) {
    if (!monthlyQuota || monthlyQuota <= 0) return;
    const used = await this.getMonthlyUsage(tenantId);
    if (used >= monthlyQuota) {
      throw new ForbiddenException('WHATSAPP_QUOTA_EXCEEDED');
    }
  }

  private async resolveWhatsAppNumberStatus(tenantId: string) {
    const setting = await this.prisma.whatsAppSetting.findUnique({
      where: { tenantId },
      select: { enabled: true },
    });

    if (setting && setting.enabled === false) {
      return 'DISABLED';
    }

    try {
      await this.phoneNumbersService.getPhoneNumberForPurpose(
        tenantId,
        WhatsAppPhoneNumberPurpose.DEFAULT,
      );
      return 'CONNECTED';
    } catch {
      return 'DISCONNECTED';
    }
  }

  async getDashboard(tenantId: string) {
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
  }

  async sendMessage(tenantId: string, dto: SendWhatsAppMessageDto) {
    const { features } = await this.getSubscriptionContext(tenantId);

    if (!features.manualMessaging) {
      throw new ForbiddenException('FEATURE_MANUAL_MESSAGING_DISABLED');
    }

    await this.phoneNumbersService.getPhoneNumberForPurpose(
      tenantId,
      WhatsAppPhoneNumberPurpose.DEFAULT,
    );

    await this.ensureQuotaAvailable(tenantId, features.monthlyQuota);

    // ---------------------------------------------------------
    // A. FREE TEXT FLOW (Manual Reply / Staff)
    // ---------------------------------------------------------
    if (dto.text) {
      // 1. Create Log Entry (MANUAL)
      const log = await this.prisma.whatsAppLog.create({
        data: {
          tenantId,
          phone: dto.phone,
          type: 'MANUAL',
          status: 'QUEUED',
          metadata: {
            text_snippet: dto.text.substring(0, 50),
            campaignId: dto.campaignId ?? null,
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
            error: result.error ? JSON.stringify(result.error) : 'Unknown error',
          },
        });
      }

      return this.prisma.whatsAppLog.findUnique({ where: { id: log.id } });
    }

    // ---------------------------------------------------------
    // B. TEMPLATE FLOW (Legacy / System)
    // ---------------------------------------------------------
    if (!dto.templateId) {
      throw new BadRequestException('Either text or templateId must be provided');
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

    const log = await this.prisma.whatsAppLog.create({
      data: {
        tenantId,
        phone: dto.phone,
        type: 'MANUAL',
        status: 'QUEUED',
        metadata: {
          templateName: template.metaTemplateName,
          templateKey: template.templateKey,
          campaignId: dto.campaignId ?? null,
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
        },
      },
    );

    if (!result.success && !result.error) {
      await this.prisma.whatsAppLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: result.reason ?? 'Unknown error' },
      });
    }

    return this.prisma.whatsAppLog.findUnique({ where: { id: log.id } });
  }

  async createCampaign(
    tenantId: string,
    dto: CreateWhatsAppCampaignDto,
  ): Promise<WhatsAppCampaignRecord> {
    await this.ensureFeature(tenantId, 'bulkCampaign');

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
    await this.ensureFeature(tenantId, 'reports');

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

    return this.prisma.whatsAppLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: 200,
    });
  }
}
