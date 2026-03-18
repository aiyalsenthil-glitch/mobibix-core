import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class DistributorScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // In actual implementation, Extract distributorId from JWT
    // For now, assuming request.user has distributorId populated by an AuthGuard
    const distributorId = request.user?.distributorId;

    if (!distributorId) {
      throw new ForbiddenException('Distributor context is required.');
    }

    // If request touches a specific retailer via URL param
    const { retailerId } = request.params;
    if (retailerId) {
      const link = await this.prisma.distDistributorRetailer.findUnique({
        where: {
          distributorId_retailerId: {
            distributorId,
            retailerId,
          },
        },
      });

      if (!link || link.status !== 'ACTIVE') {
        throw new ForbiddenException('You do not have active access to this retailer.');
      }
    }

    // Attach distributorId to request for service layer scoping
    request.distributorContext = { distributorId };
    return true;
  }
}
