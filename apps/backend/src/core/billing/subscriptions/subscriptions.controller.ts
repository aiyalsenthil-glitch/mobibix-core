import {
  Controller,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(JwtAuthGuard)
@Controller('billing/subscription')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}
  @Get('current')
  async getCurrent(@Req() req: any) {
    if (!req.user || !req.user.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const sub = await this.subscriptionsService.getCurrentActiveSubscription(
      req.user.tenantId,
    );
    const upcoming = await this.subscriptionsService.getUpcomingSubscription(
      req.user.tenantId,
    );

    // No active subscription → trial
    if (!sub) {
      return {
        plan: 'TRIAL',
        planLevel: 0,
        memberLimit: 0,
        daysLeft: 0,
        isTrial: true,
        subscriptionStatus: 'TRIAL',
        canUpgrade: true,
        isUnlimited: true,
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
    const isUnlimited = plan.memberLimit === 0;

    // IMPORTANT BUSINESS RULE:
    // Backend NEVER blocks upgrade based on expiry
    const canUpgrade = true;
    return {
      current: {
        plan: plan.name,
        planLevel: plan.level,
        memberLimit: plan.memberLimit,
        daysLeft,
        isTrial: sub.status === 'TRIAL',
        subscriptionStatus,
        isUnlimited,
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
