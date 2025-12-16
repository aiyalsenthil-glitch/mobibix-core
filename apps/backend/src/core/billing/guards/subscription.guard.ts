import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Safety: if no user or tenant, allow request
    if (!user?.tenantId) {
      return true;
    }

    const subscription =
      await this.subscriptionsService.getSubscriptionByTenant(user.tenantId);

    if (!subscription) {
      request.subscription = {
        status: 'NONE',
        daysLeft: null,
      };
      return true;
    }

    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const diffMs = endDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    request.subscription = {
      status: subscription.status,
      daysLeft,
      plan: subscription.plan?.name,
    };

    return true; // 🚨 WARN ONLY — NO BLOCKING
  }
}
