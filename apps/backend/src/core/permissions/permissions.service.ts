import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleType, Prisma } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { runPermissionSeed } from './permissions.seed-logic';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async seedPermissions() {
    return runPermissionSeed(this.prisma as any);
  }

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

    const result = await this.checkPermissionDB(
      userId,
      tenantId,
      shopId,
      moduleType,
      resourceSearch,
      actionSearch,
    );

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
        select: { roleId: true },
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
          },
        },
      },
    });

    return !!hasPerm;
  }

  // Cache Invalidation (Phase 5: Broadcast via Redis Pub/Sub)
  async invalidateUserPermissions(userId: string, tenantId: string) {
    await this.cacheService.invalidatePattern(`perm:${userId}:${tenantId}`);
  }

  async getApprovalPolicy(
    resource: string,
    action: string,
    moduleType: ModuleType,
  ) {
    const perm = await this.prisma.permission.findFirst({
      where: { action, resource: { name: resource, moduleType } },
      select: { approvalPolicy: true },
    });
    return perm?.approvalPolicy || null;
  }

  /**
   * 🛡️ Get flattened permissions for a user in a tenant (and optionally a shop)
   * Format: "resource.action" (matches frontend sidebar requiredPermissions)
   */
  async getConsolidatedPermissions(
    userId: string,
    tenantId: string,
    shopId?: string | null,
  ): Promise<string[]> {
    // 1. System Owner / Owner Role = Super Admin
    const userTenant = await this.prisma.userTenant.findFirst({
      where: { userId, tenantId, deletedAt: null },
    });

    if (userTenant?.isSystemOwner || userTenant?.role === 'OWNER') {
      return ["*"];
    }

    // 2. Resolve roles for this user in this tenant
    // If shopId is provided, get roles for that shop. 
    // If not, get all roles across all shops to give them a "global" view for now
    const shopStaffs = await this.prisma.shopStaff.findMany({
      where: {
        userId,
        tenantId,
        isActive: true,
        deletedAt: null,
        ...(shopId ? { shopId } : {}),
      },
      select: { roleId: true },
    });

    const roleIds = shopStaffs
      .map((s) => s.roleId)
      .filter((id): id is string => !!id);

    if (roleIds.length === 0) return [];

    // 3. Fetch all mapped permissions
    const mappings = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: {
        permission: {
          include: { resource: true },
        },
      },
    });

    // 4. Transform to frontend strings: "module.resource.action"
    // Note: We use Set to dedup permissions across multiple roles/shops
    const perms = new Set<string>();
    mappings.forEach((m) => {
      perms.add(
        `${m.permission.resource.moduleType.toLowerCase()}.${m.permission.resource.name}.${m.permission.action}`,
      );
    });

    return Array.from(perms);
  }

  // --- Role Management CRUD ---

  async listRoles(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledModules: true },
    });
    const allowedModules = ['CORE', ...(tenant?.enabledModules || [])];

    const roles = await this.prisma.role.findMany({
      where: {
        OR: [
          { tenantId: null }, // System Roles
          { tenantId, deletedAt: null }, // Custom Tenant Roles
        ],
      },
      include: {
        rolePermissions: {
          include: {
            permission: {
              include: { resource: true },
            },
          },
        },
      },
      orderBy: { isSystem: 'desc' },
    });

    const filteredRoles = roles.filter((role) => {
      // Custom roles are already scoped to the tenant, so they're safe.
      // We only need to filter System Roles.
      if (!role.isSystem) return true;

      // For system roles, check if EVERY permission belongs to an allowed module.
      // If a single permission belongs to a module not in allowedModules, hide the role.
      // Root role (permissions length 0) is an exception, usually bypasses this,
      // but let's check explicit mappings.
      if (role.rolePermissions.length === 0) return true;

      return role.rolePermissions.every((rp) =>
        allowedModules.includes(rp.permission.resource.moduleType),
      );
    });

    return filteredRoles.map((role) => {
      const { rolePermissions, ...rest } = role;
      return {
        ...rest,
        permissions: rolePermissions.map(
          (m) =>
            `${m.permission.resource.moduleType.toLowerCase()}.${m.permission.resource.name}.${m.permission.action}`,
        ),
      };
    });
  }

  async getRoleById(roleId: string, tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ tenantId: null }, { tenantId, deletedAt: null }],
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async getRolePermissions(roleId: string) {
    const mappings = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: {
          include: { resource: true },
        },
      },
    });

    // Flatten to "module.resource.action" strings
    return mappings.map(
      (m) =>
        `${m.permission.resource.moduleType.toLowerCase()}.${m.permission.resource.name}.${m.permission.action}`,
    );
  }

  async createRole(
    tenantId: string,
    name: string,
    description: string,
    permissions: string[],
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledModules: true },
    });
    const allowedModules = ['CORE', ...(tenant?.enabledModules || [])];

    if (permissions && permissions.length > 0) {
      for (const pStr of permissions) {
        const module = pStr.split('.')[0].toUpperCase();
        if (!allowedModules.includes(module)) {
          throw new ForbiddenException(
            `Cannot assign permissions for unentitled module: ${module}`,
          );
        }
      }
    }

    // Pre-fetch all valid permission IDs outside the transaction to avoid N+1 queries
    // that cause the transaction to expire (500 error on clone)
    const validPermissionIds: string[] = [];
    if (permissions && permissions.length > 0) {
      const dbPerms = await this.prisma.permission.findMany({
        where: {
          OR: permissions.map((pStr) => {
            const [module, resource, action] = pStr.split('.');
            return {
              action,
              resource: {
                name: resource,
                moduleType: module.toUpperCase() as ModuleType,
              },
            };
          }),
        },
      });
      validPermissionIds.push(...dbPerms.map((p) => p.id));
    }

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          tenantId,
          name,
          description,
          isSystem: false,
        },
      });

      if (validPermissionIds.length > 0) {
        // Use Promise.all with individual creates instead of createMany
        // to handle adapter/database compatibility issues while still avoiding serial N+1 waits
        await Promise.all(
          validPermissionIds.map((id) =>
            tx.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId: id,
              },
            }),
          ),
        );
      }

      return role;
    });
  }

  async updateRole(
    roleId: string,
    tenantId: string,
    data: { name?: string; description?: string; permissions?: string[] },
  ) {
    const role = await this.getRoleById(roleId, tenantId);
    if (role.isSystem)
      throw new ForbiddenException('Cannot modify system roles');

    if (data.permissions && data.permissions.length > 0) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { enabledModules: true },
      });
      const allowedModules = ['CORE', ...(tenant?.enabledModules || [])];

      for (const pStr of data.permissions) {
        const module = pStr.split('.')[0].toUpperCase();
        if (!allowedModules.includes(module)) {
          throw new ForbiddenException(
            `Cannot assign permissions for unentitled module: ${module}`,
          );
        }
      }
    }

    const validPermissionIds: string[] = [];
    if (data.permissions && data.permissions.length > 0) {
      const dbPerms = await this.prisma.permission.findMany({
        where: {
          OR: data.permissions.map((pStr) => {
            const [module, resource, action] = pStr.split('.');
            return {
              action,
              resource: {
                name: resource,
                moduleType: module.toUpperCase() as ModuleType,
              },
            };
          }),
        },
      });
      validPermissionIds.push(...dbPerms.map((p) => p.id));
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRole = await tx.role.update({
        where: { id: roleId },
        data: {
          name: data.name,
          description: data.description,
        },
      });

      if (data.permissions) {
        // Wipe and replace permissions
        await tx.rolePermission.deleteMany({ where: { roleId } });

        if (validPermissionIds.length > 0) {
          await Promise.all(
            validPermissionIds.map((id) =>
              tx.rolePermission.create({
                data: {
                  roleId,
                  permissionId: id,
                },
              }),
            ),
          );
        }
      }

      return updatedRole;
    });

    // Invalidate caches for all users with this role
    const users = await this.prisma.shopStaff.findMany({
      where: { roleId },
      select: { userId: true, tenantId: true },
    });
    for (const u of users) {
      await this.invalidateUserPermissions(u.userId, u.tenantId);
    }

    return result;
  }

  async deleteRole(roleId: string, tenantId: string) {
    const role = await this.getRoleById(roleId, tenantId);
    if (role.isSystem)
      throw new ForbiddenException('Cannot delete system roles');

    const deletedRole = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Invalidate caches for all users with this role
    const users = await this.prisma.shopStaff.findMany({
      where: { roleId },
      select: { userId: true, tenantId: true },
    });
    for (const u of users) {
      await this.invalidateUserPermissions(u.userId, u.tenantId);
    }

    return deletedRole;
  }
}
