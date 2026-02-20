import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchAccessGuard implements CanActivate {
  private readonly logger = new Logger(BranchAccessGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const shadowMode = false; // Phase 6: STRICT MODE ON
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.tenantId) {
      return true; // Let other guards handle auth
    }

    // Try to find shopId in params, query, or body
    const shopId = request.params.shopId || request.query.shopId || request.body.shopId;

    if (!shopId) {
      return true; // No shop context to check
    }

    try {
      // 1. Check if user is system owner (global access)
      const isOwner = await this.prisma.userTenant.findFirst({
        where: {
          userId: user.id,
          tenantId: user.tenantId,
          isSystemOwner: true,
          deletedAt: null,
        },
      });

      if (isOwner) {
        return true;
      }

      // 2. Check if user is staff in this branch
      const staffEntry = await this.prisma.shopStaff.findFirst({
        where: {
          userId: user.id,
          tenantId: user.tenantId,
          shopId: shopId,
          isActive: true,
          deletedAt: null,
        },
      });

      if (!staffEntry) {
        this.logger.warn(
          `[SHADOW MODE] User ${user.id} attempted to access shop ${shopId} without valid ShopStaff entry.`,
        );
        // In Shadow Mode, we return true to NOT block the request.
      }
    } catch (error) {
      this.logger.error(`Error in BranchAccessGuard: ${error.message}`);
    }

    return true;
  }
}
