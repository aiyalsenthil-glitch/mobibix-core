import {
  Controller,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { ModuleType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('billing/subscription')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
  ) {}
  @Get('current')
  async getCurrent(@Req() req: any, @Query('module') module?: ModuleType) {
    if (!req.user || !req.user.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    let resolvedModule = module;

    // 🔍 If module not provided, resolve from Tenant Type
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { tenantType: true },
      });

      if (tenant) {
        resolvedModule = tenant.tenantType === 'GYM' ? 'GYM' : 'MOBILE_SHOP';
      } else {
        resolvedModule = 'MOBILE_SHOP'; // Fallback
      }
    }

    const sub = await this.subscriptionsService.getCurrentActiveSubscription(
      req.user.tenantId,
      resolvedModule,
    );
    const upcoming = await this.subscriptionsService.getUpcomingSubscription(
      req.user.tenantId,
      resolvedModule,
    );

    // No active subscription → trial
    if (!sub) {
      return {
        plan: 'GYM_TRIAL',
        planLevel: 0,
        daysLeft: 0,
        isTrial: true,
        subscriptionStatus: 'TRIAL',
        canUpgrade: true,
      };
    }

    const now = new Date();

    const daysLeft = Math.max(
      Math.ceil(
        (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
      0,
    );

    const subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'EXPIRED' =
      sub.endDate < now
        ? 'EXPIRED'
        : sub.status === 'TRIAL'
          ? 'TRIAL'
          : 'ACTIVE';

    const plan = sub.plan;

    // IMPORTANT BUSINESS RULE:
    // Backend NEVER blocks upgrade based on expiry
    const canUpgrade = true;
    return {
      current: {
        plan: plan.name,
        planLevel: plan.level,
        daysLeft,
        isTrial: sub.status === 'TRIAL',
        subscriptionStatus,
      },
      upcoming: upcoming
        ? {
            plan: upcoming.plan.name,
            startsAt: upcoming.startDate,
            endsAt: upcoming.endDate,
          }
        : null,
    };
  }
}
