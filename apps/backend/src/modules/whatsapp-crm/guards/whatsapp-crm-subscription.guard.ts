import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ModuleType } from '@prisma/client';
import { SubscriptionsService } from '../../../core/billing/subscriptions/subscriptions.service';

@Injectable()
export class WhatsAppCrmSubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('TENANT_REQUIRED');
    }

    const subscription =
      await this.subscriptionsService.getCurrentActiveSubscription(
        tenantId,
        ModuleType.WHATSAPP_CRM,
      );

    if (!subscription) {
      throw new ForbiddenException('WHATSAPP_CRM_SUBSCRIPTION_REQUIRED');
    }

    return true;
  }
}
