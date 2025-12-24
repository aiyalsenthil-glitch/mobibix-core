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

    if (!sub) {
      return {
        plan: 'TRIAL',
        memberLimit: 0,
        daysLeft: 0,
        isTrial: true,
      };
    }

    const today = new Date();
    const daysLeft = Math.max(
      Math.ceil(
        (sub.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      ),
      0,
    );

    const features = sub.plan.features as any;

    return {
      plan: sub.plan.name,
      planLevel: sub.plan.level, // 👈 ADD THIS
      memberLimit: features?.memberLimit ?? 0,
      daysLeft,
      isTrial: sub.status === 'TRIAL',
    };
  }
}
