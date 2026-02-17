import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleType, UserRole, SubscriptionStatus } from '@prisma/client';
import {
  GRACE_PERIOD_DAYS,
  SOFT_GRACE_PERIOD_DAYS,
} from '../../billing/grace-period.constants';

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const requestPath = request.route?.path ?? request.path ?? '';
    const originalUrl: string = request.originalUrl ?? '';
    const isTenantCreate =
      request.method === 'POST' &&
      (requestPath === '/tenant' || originalUrl.startsWith('/api/tenant'));

    if (isTenantCreate) {
      return true;
    }

    const user = request.user;

    // Allow SUPER_ADMIN and ADMIN to bypass subscription checks
    if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN) {
      return true;
    }

    const tenantId: string | undefined = user?.tenantId;

    if (!tenantId) {
      return true;
    }

    // Extract module from request context (query, body, or default to MOBILE_SHOP)
    let module: ModuleType | undefined;
    if (request.query?.module) {
      module = request.query.module;
    } else if (request.body?.module) {
      module = request.body.module;
    }

    if (!module) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tenantType: true },
      });
      module =
        tenant?.tenantType === 'GYM' ? ModuleType.GYM : ModuleType.MOBILE_SHOP;
    }

    const now = new Date();

    // 1️⃣ Fetch subscription for module
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.PAST_DUE,
          ],
        },
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE > PAST_DUE > TRIAL
        { startDate: 'desc' },
      ],
    });

    if (!subscription) {
      // Check for strictly SCHEDULED to give better error
      const scheduled = await this.prisma.tenantSubscription.findFirst({
        where: { tenantId, module, status: SubscriptionStatus.SCHEDULED },
      });
      if (scheduled) throw new ForbiddenException('SUBSCRIPTION_NOT_STARTED');

      throw new ForbiddenException('SUBSCRIPTION_REQUIRED');
    }

    const gracePeriodEnd = new Date(subscription.endDate || now);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    const softGracePeriodEnd = new Date(subscription.endDate || now);
    softGracePeriodEnd.setDate(
      softGracePeriodEnd.getDate() + SOFT_GRACE_PERIOD_DAYS,
    );

    const isExpired = subscription.endDate && now > gracePeriodEnd;
    const isSoftExpired = subscription.endDate && now > softGracePeriodEnd;
    const isPastDue = subscription.status === SubscriptionStatus.PAST_DUE;

    // 2️⃣ Hard Block: EXPIRED or beyond Soft Grace Period
    if (subscription.status === SubscriptionStatus.EXPIRED || isSoftExpired) {
      throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
    }

    // 3️⃣ Soft Block: Read-Only for PAST_DUE or during Soft Grace Period
    if (isExpired || isPastDue) {
      const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
      if (isMutation) {
        throw new ForbiddenException(
          isPastDue
            ? 'PAYMENT_PAST_DUE_READ_ONLY'
            : 'SUBSCRIPTION_EXPIRED_READ_ONLY',
        );
      }

      const daysRemaining = subscription.endDate
        ? Math.ceil(
            (softGracePeriodEnd.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      request.gracePeriodWarning = {
        daysRemaining,
        expiryDate: subscription.endDate,
        message: isPastDue
          ? `Payment past due. Read-only mode active.`
          : `Subscription expired. ${daysRemaining} days remaining in read-only grace period.`,
      };
    }

    return true;
  }
}
