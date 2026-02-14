import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { PlanRulesService } from '../billing/plan-rules.service';
import { ModuleType, BillingCycle, UserRole } from '@prisma/client';
import { SkipSubscriptionCheck } from '../auth/decorators/skip-subscription-check.decorator';
import { subMonths, subYears, startOfMonth } from 'date-fns';
import { Roles } from '../auth/decorators/roles.decorator';

interface UsageSummary {
  members: { used: number; limit: number | null };
  staff: { used: number; limit: number | null };
  whatsapp: {
    utility: {
      used: number;
      limit: number;
      remaining: number;
      friendlyText: string;
    };
    marketing: {
      used: number;
      limit: number;
      remaining: number;
      friendlyText: string;
    };
    service: {
      used: number;
      limit: number;
      remaining: number;
      friendlyText: string;
    };
  };
  plan: { code: string; name: string; level: number };
  nextBillingDate: Date | null;
  upgradeRecommended: boolean;
}

@Controller('tenant')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
export class TenantUsageController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly planRulesService: PlanRulesService,
  ) {}

  @Get('usage-summary')
  @SkipSubscriptionCheck() // Allow even if expired (for upgrade flow)
  async getUsageSummary(@Req() req: any): Promise<UsageSummary> {
    const tenantId = req.user.tenantId;

    // Determine module from tenant type
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantType: true },
    });

    const module =
      tenant?.tenantType === 'GYM' ? ModuleType.GYM : ModuleType.MOBILE_SHOP;

    // Get current subscription
    const subscription =
      await this.subscriptionsService.getCurrentActiveSubscription(
        tenantId,
        module,
      );

    const planCode = subscription?.plan?.code || 'TRIAL';

    // Get plan rules for the specific module
    const rules = await this.planRulesService.getPlanRulesForTenant(
      tenantId,
      module, // 🔥 Pass module
    );

    // Count members
    const memberCount = await this.prisma.member.count({
      where: { tenantId, isActive: true },
    });

    // Count staff
    const staffCount = await this.prisma.userTenant.count({
      where: { tenantId, role: { not: 'OWNER' } },
    });

    // WhatsApp Usage Calculation
    let cycleStartDate: Date;

    if (subscription && subscription.endDate) {
      // Loop back one cycle from end date to find start
      // This works even for expired subscriptions to show "last cycle usage"
      const cycle = subscription.billingCycle || BillingCycle.MONTHLY;
      if (cycle === BillingCycle.YEARLY) {
        cycleStartDate = subYears(subscription.endDate, 1);
      } else {
        // Monthly or Quarterly (treat as monthly for now or specific logic?)
        // For simplicity, treating default as monthly lookback
        cycleStartDate = subMonths(subscription.endDate, 1);
      }
    } else {
      // No subscription or trial -> default to start of current month
      cycleStartDate = startOfMonth(new Date());
    }

    const usageAggregation = await this.prisma.whatsAppDailyUsage.aggregate({
      where: {
        tenantId,
        date: { gte: cycleStartDate },
      },
      _sum: {
        utility: true,
        marketing: true,
        authentication: true,
        service: true,
      },
    });

    // Grouping:
    // Utility = Utility + Service + Authentication (Service includes user-initiated, Auth is OTP)
    // Marketing = Marketing
    const whatsappUtilityUsed =
      (usageAggregation._sum.utility || 0) +
      (usageAggregation._sum.service || 0) +
      (usageAggregation._sum.authentication || 0);

    const whatsappMarketingUsed = usageAggregation._sum.marketing || 0;

    // Translate WhatsApp quotas to friendly text
    const translateQuota = (limit: number, isDaily?: boolean): string => {
      if (limit === 0) return 'Upgrade to unlock';
      if (isDaily) return `${limit} messages/day`;
      if (limit >= 1000)
        return `Notify ~${Math.floor(limit * 0.7)} customers/month`;
      if (limit >= 300)
        return `~${Math.floor(limit * 0.7)} notifications/month`;
      return `${limit} messages/month`;
    };

    const whatsappLimits = rules?.whatsapp || { messageQuota: 0 };
    const totalQuota = whatsappLimits.messageQuota || 0;
    const maxStaff = rules?.maxStaff ?? 0;
    const maxMembers = rules?.maxMembers ?? 0;

    return {
      members: {
        used: memberCount,
        limit: maxMembers === 0 ? null : maxMembers,
      },
      staff: {
        used: staffCount,
        limit: maxStaff === 0 ? null : maxStaff,
      },
      whatsapp: {
        utility: {
          limit: totalQuota,
          used: whatsappUtilityUsed,
          remaining: Math.max(
            0,
            totalQuota - whatsappUtilityUsed - whatsappMarketingUsed,
          ),
          friendlyText: translateQuota(totalQuota, false),
        },
        marketing: {
          limit: totalQuota,
          used: whatsappMarketingUsed,
          remaining: Math.max(
            0,
            totalQuota - whatsappUtilityUsed - whatsappMarketingUsed,
          ),
          friendlyText: translateQuota(totalQuota, false),
        },
        service: {
          limit: -1, // Service is usually unlimited 24h window
          used: usageAggregation._sum.service || 0,
          remaining: -1,
          friendlyText: 'Unlimited',
        },
      },
      plan: {
        code: planCode, // Updated to use planCode variable
        name: subscription?.plan?.name || 'Trial',
        level: subscription?.plan?.level || 0,
      },
      nextBillingDate: subscription?.endDate || null,
      upgradeRecommended:
        (maxMembers > 0 && memberCount >= maxMembers * 0.8) ||
        (maxStaff > 0 && staffCount >= maxStaff * 0.8),
    };
  }

  @Get('usage-history')
  @SkipSubscriptionCheck()
  async getUsageHistory(@Req() req: any, @Query('days') days?: string) {
    const tenantId = req.user.tenantId;
    const historyDays = days ? parseInt(days) : 30;

    // We need to inject UsageSnapshotService.
    // Since it wasn't injected before, I need to check if it's exported and available in the module.
    // For now, I'll fetch directly from Prisma to avoid circular deps or module refactoring if not strictly needed,
    // OR I can add it to the constructor if it's available.
    // Let's check constructor first - ah, I need to update constructor.
    // Wait, checking previous file content... constructor has:
    // private readonly prisma: PrismaService,
    // private readonly subscriptionsService: SubscriptionsService,
    // private readonly planRulesService: PlanRulesService,

    // Direct Prisma call is easiest and safe here as logic is simple.
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - historyDays);

    const history = await this.prisma.usageSnapshot.findMany({
      where: {
        tenantId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        activeMembers: true,
        activeStaff: true,
        activeShops: true,
      },
    });

    return history;
  }
}
