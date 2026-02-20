import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleType } from '@prisma/client';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async hasPermission(
    userId: string,
    tenantId: string,
    shopId: string | null,
    moduleType: ModuleType,
    resourceSearch: string,
    actionSearch: string,
  ): Promise<boolean> {
    const cacheKey = `perm:${userId}:${tenantId}:${shopId || 'global'}:${moduleType}:${resourceSearch}:${actionSearch}`;
    
    // Phase 2: Use local LRU cache. Phase 5 will upgrade to Redis Distributed Cache
    const cached = await this.cacheService.get<boolean>(cacheKey);
    if (cached !== undefined) return cached;

    const result = await this.checkPermissionDB(userId, tenantId, shopId, moduleType, resourceSearch, actionSearch);
    
    // Cache for 5 minutes locally
    await this.cacheService.set(cacheKey, result, 1000 * 60 * 5);
    return result;
  }

  private async checkPermissionDB(
    userId: string,
    tenantId: string,
    shopId: string | null,
    moduleType: ModuleType,
    resourceSearch: string,
    actionSearch: string,
  ): Promise<boolean> {
    // 1. Is Root Owner? (Bypasses all checks)
    const isOwner = await this.prisma.userTenant.findFirst({
      where: { userId, tenantId, isSystemOwner: true, deletedAt: null },
    });
    if (isOwner) return true;

    // 2. Resolve Role assigned to user
    let roleId: string | null = null;
    if (shopId) {
      const staff = await this.prisma.shopStaff.findFirst({
        where: { userId, tenantId, shopId, isActive: true, deletedAt: null },
        select: { roleId: true }
      });
      if (!staff || !staff.roleId) return false;
      roleId = staff.roleId;
    } else {
      // Global tenant action.
      // Currently, staff are assigned at shop level. If they are an owner, they got caught in step 1.
      return false;
    }

    // 3. Check specific permission mapping
    const hasPerm = await this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        permission: {
          action: actionSearch,
          resource: {
            name: resourceSearch,
            moduleType: moduleType,
          }
        }
      }
    });

    return !!hasPerm;
  }
  
  // Cache Invalidation (Phase 5: Broadcast via Redis Pub/Sub)
  async invalidateUserPermissions(userId: string, tenantId: string) {
     await this.cacheService.invalidatePattern(`perm:${userId}:${tenantId}`);
  }
  
  async getApprovalPolicy(resource: string, action: string, moduleType: ModuleType) {
    const perm = await this.prisma.permission.findFirst({
       where: { action, resource: { name: resource, moduleType } },
       select: { approvalPolicy: true }
    });
    return perm?.approvalPolicy || null;
  }
}
