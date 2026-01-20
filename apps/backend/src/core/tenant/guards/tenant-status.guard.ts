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

    if (request.method === 'POST' && request.route?.path === '/tenant') {
      return true;
    }

    const user = request.user;
    const tenantId: string | undefined = user?.tenantId;

    if (!tenantId) {
      return true;
    }

    const now = new Date();

    /**
     * 1️⃣ ACTIVE always wins
     */
    const active = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
        endDate: { gt: now },
      },
    });

    if (active) {
      return true;
    }

    /**
     * 2️⃣ Valid TRIAL is treated as ACTIVE
     */
    const trial = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: 'TRIAL',
        endDate: { gt: now },
      },
    });

    if (trial) {
      return true;
    }

    /**
     * 3️⃣ If only SCHEDULED exists → deny
     */
    const scheduled = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: 'SCHEDULED',
      },
    });

    if (scheduled) {
      throw new ForbiddenException('SUBSCRIPTION_NOT_STARTED');
    }

    /**
     * 4️⃣ Everything else → expired
     */
    throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
  }
}
