import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleType, SubscriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { MODULE_SCOPE_KEY } from '../decorators/module-scope.decorator';
import {
  GRACE_PERIOD_DAYS,
  SOFT_GRACE_PERIOD_DAYS,
} from '../../billing/grace-period.constants';

/**
 * SubscriptionGuard - Enforces MODULE-AWARE tenant subscription limits
 *
 * CRITICAL FIX: Now validates subscriptions PER MODULE (GYM vs SHOP)
 * - Reads @ModuleScope decorator from controller
 * - Validates tenant has ACTIVE subscription for THAT SPECIFIC module
 * - Prevents cross-module subscription bypass
 *
 * Use @SkipSubscriptionCheck() decorator to bypass for specific endpoints
 */

export const SKIP_SUBSCRIPTION_CHECK_KEY = 'skipSubscriptionCheck';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint has @SkipSubscriptionCheck() decorator
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      // No tenant context - let other guards handle auth
      return true;
    }

    const tenantId = user.tenantId;

    // 🔥 NEW: Read module scope from decorator
    const moduleScope = this.reflector.getAllAndOverride<ModuleType>(
      MODULE_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no module scope specified, allow (backward compatibility for non-module routes)
    if (!moduleScope) {
      this.logger.verbose(
        `No @ModuleScope decorator found - skipping module-specific check for tenant ${tenantId}`,
      );
      return true;
    }

    // 🔥 CRITICAL FIX: Fetch subscription for SPECIFIC MODULE from Cache (5 Min TTL)
    const cacheKey = `tenant:${tenantId}:subscription:${moduleScope}`;
    const subscription = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.tenantSubscription.findFirst({
          where: {
            tenantId,
            module: moduleScope,
            // Include PAST_DUE in the allowed set for initial check
            status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
          },
          include: {
            plan: true,
          },
          orderBy: [
            { status: 'asc' }, // ACTIVE > PAST_DUE > TRIAL
            { startDate: 'desc' },
          ],
        });
      },
      1000 * 60 * 5, // 5 minutes TTL
    );

    if (!subscription) {
      this.logger.warn(
        `Subscription check failed: No active ${moduleScope} subscription for tenant ${tenantId}`,
      );
      throw new ForbiddenException(
        `No active ${moduleScope} subscription. Please subscribe to continue.`,
      );
    }

    const now = new Date();

    const gracePeriodEnd = new Date(subscription.endDate || now);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    const softGracePeriodEnd = new Date(subscription.endDate || now);
    softGracePeriodEnd.setDate(
      softGracePeriodEnd.getDate() + SOFT_GRACE_PERIOD_DAYS,
    );

    const isExpired = subscription.endDate && now > gracePeriodEnd;
    const isPastDue = subscription.status === 'PAST_DUE';

    // 1. Hard Block: EXPIRED or beyond Soft Grace Period
    if (
      subscription.status === 'EXPIRED' ||
      (subscription.endDate && now > softGracePeriodEnd)
    ) {
      this.logger.warn(`Subscription EXPIRED for tenant ${tenantId}`);
      throw new ForbiddenException(
        'Your subscription has expired. Please renew to continue.',
      );
    }

    // 2. Soft Block: Within Soft Grace Period OR PAST_DUE
    // Allow GET, block mutations
    if (isExpired || isPastDue) {
      const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
      if (isMutation) {
        this.logger.warn(
          `Mutation blocked for ${isPastDue ? 'PAST_DUE' : 'EXPIRED'} tenant ${tenantId} (${request.method} ${request.url})`,
        );
        throw new ForbiddenException(
          isPastDue
            ? 'Your payment is past due. Access is limited to Read-Only.'
            : 'Your subscription has expired. Access is limited to Read-Only during the grace period.',
        );
      }

      // Attach warning to request
      request.subscriptionWarning = isPastDue
        ? 'Payment past due. Read-Only mode enabled.'
        : 'Subscription expired. Read-Only grace period active.';
    }

    // Block CANCELLED subscriptions
    if (subscription.status === 'CANCELLED') {
      this.logger.warn(
        `Subscription check failed: ${moduleScope} subscription cancelled for tenant ${tenantId}`,
      );
      throw new ForbiddenException(
        'Your subscription has been cancelled. Please reactivate to continue.',
      );
    }

    // Store subscription info in request for later use
    request.subscription = subscription;

    this.logger.verbose(
      `Subscription check passed: tenant ${tenantId} has active ${moduleScope} subscription (${subscription.plan.name})`,
    );

    return true;
  }
}
