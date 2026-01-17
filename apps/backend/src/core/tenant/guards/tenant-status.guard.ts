import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const tenantId: string | undefined = user?.tenantId;

    /**
     * 1️⃣ Allow onboarding / auth flows
     */
    if (!tenantId) {
      return true;
    }

    /**
     * 2️⃣ Load ALL subscriptions for tenant
     */
    const subscriptions = await this.prisma.tenantSubscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscriptions.length) {
      throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
    }

    const now = new Date();

    /**
     * 3️⃣ ACTIVE subscription ALWAYS wins
     */
    const active = subscriptions.find(
      (s) => s.status === 'ACTIVE' && (!s.endDate || s.endDate > now),
    );

    if (active) {
      return true;
    }

    /**
     * 4️⃣ Valid TRIAL (not expired)
     */
    const trial = subscriptions.find((s) => s.status === 'TRIAL');

    if (trial) {
      if (trial.endDate && trial.endDate < now) {
        throw new ForbiddenException('TRIAL_EXPIRED');
      }
      return true;
    }

    /**
     * 5️⃣ Only SCHEDULED subscriptions exist
     */
    const hasScheduled = subscriptions.some((s) => s.status === 'SCHEDULED');

    if (hasScheduled) {
      throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
    }

    /**
     * 6️⃣ CANCELLED explicitly
     */
    const cancelled = subscriptions.find((s) => s.status === 'CANCELLED');

    if (cancelled) {
      throw new ForbiddenException('ACCOUNT_DISABLED');
    }

    /**
     * 7️⃣ Everything else → expired
     */
    throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
  }
}
