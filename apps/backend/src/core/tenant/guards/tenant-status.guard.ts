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

    if (!tenantId) {
      return true;
    }

    const now = new Date();

    /**
     * 1️⃣ Fast path: check ACTIVE subscription (single row)
     */ const active = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
        endDate: {
          gt: new Date(),
        },
      },
    });

    if (active) {
      return true;
    }

    /**
     * 2️⃣ Fallback: check latest subscription only (single row)
     */
    const latest = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
    }

    if (latest.status === 'TRIAL') {
      if (latest.endDate && latest.endDate < now) {
        throw new ForbiddenException('TRIAL_EXPIRED');
      }
      return true;
    }

    if (latest.status === 'SCHEDULED') {
      throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
    }

    if (latest.status === 'CANCELLED') {
      throw new ForbiddenException('ACCOUNT_DISABLED');
    }

    throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
  }
}
