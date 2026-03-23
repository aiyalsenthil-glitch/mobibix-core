import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class DistributorScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Look up DistDistributor by userId first (pure distributor, no ERP tenant),
    // then fall back to tenantId (ERP user who activated distributor mode).
    const userId = user?.sub ?? user?.id;
    const tenantId = user?.tenantId ?? null;

    const dist = await this.prisma.distDistributor.findFirst({
      where: {
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(tenantId ? [{ tenantId }] : []),
        ],
      },
      select: { id: true, isActive: true },
    });

    if (!dist || !dist.isActive) {
      throw new ForbiddenException(
        'Distributor context is required. This account is not registered as a distributor.',
      );
    }

    // If request touches a specific retailer via URL param, verify the link is active
    const { retailerId } = request.params;
    if (retailerId) {
      const link = await this.prisma.distDistributorRetailer.findUnique({
        where: {
          distributorId_retailerId: {
            distributorId: dist.id,
            retailerId,
          },
        },
      });

      if (!link || link.status !== 'ACTIVE') {
        throw new ForbiddenException('You do not have active access to this retailer.');
      }
    }

    // Attach distributorId to request for service layer scoping
    request.distributorContext = { distributorId: dist.id };
    return true;
  }
}
