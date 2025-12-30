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

    // No tenant → allow (tenant creation flow)
    if (!user?.tenantId) {
      return true;
    }

    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId: user.tenantId },
      select: { status: true },
    });

    if (!subscription) {
      throw new ForbiddenException('ACCOUNT_DISABLED');
    }

    if (subscription.status === 'CANCELLED') {
      throw new ForbiddenException('ACCOUNT_DISABLED');
    }

    return true;
  }
}
