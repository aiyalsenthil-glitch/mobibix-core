import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ModuleType } from '@prisma/client';

export const SKIP_SUBSCRIPTION_CHECK = 'skipSubscriptionCheck';
export const SkipSubscriptionCheck = () =>
  Reflect.metadata(SKIP_SUBSCRIPTION_CHECK, true);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is decorated with @SkipSubscriptionCheck()
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Safety: if no user or tenant, allow request
    if (!user?.tenantId) {
      return true;
    }

    // Extract module from request context (default to MOBILE_SHOP)
    let module = ModuleType.MOBILE_SHOP;
    if (request.query?.module) {
      module = request.query.module;
    } else if (request.body?.module) {
      module = request.body.module;
    }

    const subscription =
      await this.subscriptionsService.getSubscriptionByTenant(
        user.tenantId,
        module,
      );

    if (!subscription) {
      request.subscription = {
        status: 'NONE',
        daysLeft: null,
      };
      return true; // Allow if no subscription (for initial setup)
    }

    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const diffMs = endDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Determine effective state
    let effectiveState: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'CANCELLED' =
      'ACTIVE';

    if (subscription.status === 'CANCELLED') {
      effectiveState = 'CANCELLED';
    } else if (subscription.status === 'EXPIRED') {
      effectiveState = 'EXPIRED';
    } else if (daysLeft <= 0) {
      effectiveState = 'EXPIRED';
    } else if (daysLeft <= 7) {
      effectiveState = 'GRACE_PERIOD';
    }

    request.subscription = {
      status: effectiveState,
      daysLeft,
      plan: subscription.plan?.name,
    };

    // Enforce state-based access
    const method = request.method;
    const isMutatingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      method,
    );

    // Whitelist: Always allow billing/upgrade endpoints
    const path = request.route?.path || request.url;
    const isBillingEndpoint =
      path.includes('/billing/') || path.includes('/subscription/');

    if (isBillingEndpoint) {
      return true; // Always allow billing operations
    }

    // CANCELLED: Full block
    if (effectiveState === 'CANCELLED') {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_CANCELLED',
        message:
          'Your subscription has been cancelled. Please contact support.',
      });
    }

    // EXPIRED: Block all writes, allow reads
    if (effectiveState === 'EXPIRED') {
      if (isMutatingRequest) {
        throw new ForbiddenException({
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Your subscription has expired. Please renew to continue.',
          daysLeft,
        });
      }
      return true; // Allow reads
    }

    // GRACE_PERIOD: Block writes, allow reads (with warning)
    if (effectiveState === 'GRACE_PERIOD') {
      if (isMutatingRequest) {
        throw new ForbiddenException({
          code: 'SUBSCRIPTION_GRACE_PERIOD',
          message: `Your subscription expires in ${daysLeft} days. Please renew soon.`,
          daysLeft,
        });
      }
      return true; // Allow reads
    }

    // ACTIVE: Full access
    return true;
  }
}
