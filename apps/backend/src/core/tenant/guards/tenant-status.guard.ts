import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { ModuleType, UserRole, SubscriptionStatus } from '@prisma/client';
import {
  GRACE_PERIOD_DAYS,
  SOFT_GRACE_PERIOD_DAYS,
  HARD_GRACE_PERIOD_HOURS,
} from '../../billing/grace-period.constants';
import { MODULE_SCOPE_KEY } from '../../auth/decorators/module-scope.decorator';
import { SKIP_SUBSCRIPTION_CHECK_KEY } from '../../auth/guards/subscription.guard';

// TTLs
const TENANT_STATUS_TTL   = 60_000;   // 60s — deletion status changes rarely
const SUBSCRIPTION_TTL    = 60_000;   // 60s — subscription status changes rarely

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const requestPath = request.route?.path ?? request.path ?? '';
    const originalUrl: string = request.originalUrl ?? '';
    const isTenantCreate =
      request.method === 'POST' &&
      (requestPath === '/tenant' || originalUrl.startsWith('/api/tenant'));

    if (isTenantCreate) return true;

    const user = request.user;

    // Allow SUPER_ADMIN and ADMIN to bypass
    if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN) {
      return true;
    }

    const tenantId: string | undefined = user?.tenantId;
    if (!tenantId) return true;

    // ─── 1. Tenant deletion check (cached) ───────────────────────────────────
    const tenantKey = `tenant:${tenantId}:status`;
    const tenant = await this.cache.getOrSet(
      tenantKey,
      () => this.prisma.tenant.findUnique({
        where: { id: tenantId, deletedAt: null },
        select: { tenantType: true, deletionRequestPending: true },
      }),
      TENANT_STATUS_TTL,
    );

    if (tenant?.deletionRequestPending) {
      const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
      if (isMutation) {
        throw new ForbiddenException(
          'Your account is currently pending deletion and most operations are restricted. Please contact support if you need to cancel the request.',
        );
      }
    }

    // ─── 2. Skip subscription check if decorated with @SkipSubscriptionCheck() ─
    const skipSub = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipSub) return true;

    // ─── 3. Determine module scope ────────────────────────────────────────────
    let module: ModuleType | undefined = request.query?.module ?? request.body?.module;

    if (!module) {
      module = this.reflector.getAllAndOverride<ModuleType>(MODULE_SCOPE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    }

    // If still no module, derive from tenantType
    if (!module) {
      module = tenant?.tenantType === 'GYM' ? ModuleType.GYM : ModuleType.MOBILE_SHOP;
    }

    // ─── 4. Subscription check (cached) ──────────────────────────────────────
    const subKey = `tenant:${tenantId}:sub-status:${module}`;
    const subscription = await this.cache.getOrSet(
      subKey,
      () => this.prisma.tenantSubscription.findFirst({
        where: {
          tenantId,
          module,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE],
          },
        },
        include: { plan: true },
        orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      }),
      SUBSCRIPTION_TTL,
    );

    if (!subscription) {
      const scheduled = await this.prisma.tenantSubscription.findFirst({
        where: { tenantId, module, status: SubscriptionStatus.SCHEDULED },
      });
      if (scheduled) throw new ForbiddenException('SUBSCRIPTION_NOT_STARTED');
      throw new ForbiddenException('SUBSCRIPTION_REQUIRED');
    }

    // ─── 5. AI token quota ────────────────────────────────────────────────────
    const isAiRequest = originalUrl.includes('/ai/') || originalUrl.includes('/assistant/');
    if (isAiRequest) {
      const limit = subscription.plan.maxAiTokens ?? 0;
      if (limit > 0 && subscription.aiTokensUsed >= limit) {
        throw new ForbiddenException({
          message: 'AI_TOKEN_QUOTA_EXCEEDED',
          limit,
          used: subscription.aiTokensUsed,
          resetAt: subscription.lastQuotaResetAt,
        });
      }
    }

    const now = new Date();
    const softGracePeriodEnd = new Date(subscription.endDate || now);
    softGracePeriodEnd.setDate(softGracePeriodEnd.getDate() + SOFT_GRACE_PERIOD_DAYS);

    const isAutopay = subscription.autopayStatus === 'ACTIVE' && subscription.autoRenew === true;

    const mutationGraceEnd = new Date(subscription.endDate || now);
    if (isAutopay) {
      mutationGraceEnd.setHours(mutationGraceEnd.getHours() + HARD_GRACE_PERIOD_HOURS);
    }

    const isBeyondMutationGrace = now > mutationGraceEnd;
    const isBeyondSoftGrace = subscription.endDate && now > softGracePeriodEnd;
    const isPastDue = subscription.status === SubscriptionStatus.PAST_DUE;

    if (subscription.status === SubscriptionStatus.EXPIRED || isBeyondSoftGrace) {
      throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
    }

    if (isBeyondMutationGrace || isPastDue) {
      const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
      if (isMutation) {
        throw new ForbiddenException(
          isPastDue ? 'PAYMENT_PAST_DUE_READ_ONLY'
            : isAutopay ? 'AUTOPAY_RENEWAL_PENDING_READ_ONLY'
            : 'SUBSCRIPTION_EXPIRED_READ_ONLY',
        );
      }

      const daysRemaining = subscription.endDate
        ? Math.ceil((softGracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      request.gracePeriodWarning = {
        daysRemaining,
        expiryDate: subscription.endDate,
        message: isPastDue
          ? `Payment past due. Read-only mode active.`
          : `Subscription ended. ${daysRemaining} days remaining in read-only grace period.`,
      };
    }

    return true;
  }
}
