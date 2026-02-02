import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleType, UserRole } from '@prisma/client';

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.method === 'POST' && request.route?.path === '/tenant') {
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

    /**
     * 1️⃣ ACTIVE always wins
     */
    const active = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
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
        module,
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
        module,
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
