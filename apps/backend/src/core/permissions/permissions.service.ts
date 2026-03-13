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
import { PERMISSION_INHERITANCE, BASE_PERMISSIONS } from '../../security/permission-inheritance';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Expands a set of base permissions into their granular counterparts
   */
  expandPermissions(basePermissions: string[]): string[] {
    const expanded = new Set<string>();

    basePermissions.forEach((perm) => {
      expanded.add(perm);

      // Look up expansion rule (e.g. "mobile_shop.sales.manage" -> ["sale.create", "sale.view", ...])
      const children = PERMISSION_INHERITANCE[perm];
      if (children) {
        children.forEach((child) => {
          expanded.add(child);
          // Also add with module prefix for consistency in frontend if needed? 
          // Actually, our guards check for both prefixed and non-prefixed as a fallback.
          // But non-prefixed is the current standard for granular checks in checkPermissionDB.
        });
      }
    });

    return Array.from(expanded);
  }

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
    // 1. Platform-wide Bypass (SUPER_ADMIN or identified System Owner)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
      // 🔒 PRIVACY POLICY: Platform administrators are restricted from accessing tenant-specific 
      // financial and sales data to ensure data confidentiality.
      const sensitiveResources = ['sale', 'purchase', 'ledger', 'expense', 'quotation', 'receipt', 'voucher'];
      if (sensitiveResources.includes(resourceSearch.toLowerCase())) {
        this.logger.warn(`[PRIVACY BLOCKED] Platform Admin ${userId} attempted to access sensitive resource: ${resourceSearch}`);
        return false;
      }
      return true;
    }

    // 2. Tenant-specific Bypass (isSystemOwner or OWNER role)
    const userTenancy = await this.prisma.userTenant.findFirst({
      where: { userId, tenantId, deletedAt: null },
      select: { isSystemOwner: true, role: true },
    });

    if (userTenancy?.isSystemOwner || userTenancy?.role === 'OWNER') return true;

    // 3. Resolve Role assigned to user
    let roleId: string | null = null;
    
    const staff = await this.prisma.shopStaff.findFirst({
      where: { 
        userId, 
        tenantId, 
        ...(shopId ? { shopId } : {}),
        isActive: true, 
        deletedAt: null 
      },
      select: { roleId: true },
      orderBy: { createdAt: 'asc' }, // Fallback to first role if multiple
    });

    if (staff) {
      roleId = staff.roleId;
    }

    // If no role is found, permission is denied
    if (!roleId) return false;

    // 4. Fetch all permissions for this role
    const mappings = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: {
          include: { resource: true },
        },
      },
    });

    const flatPermissions = mappings.map(
      (m) => ({
        full: `${m.permission.resource.moduleType.toLowerCase()}.${m.permission.resource.name}.${m.permission.action}`,
        base: `${m.permission.resource.name}.${m.permission.action}`
      }),
    );

    // 5. Expand permissions
    const expanded = new Set<string>();
    flatPermissions.forEach((p) => {
      expanded.add(p.full);
      expanded.add(p.base);
      
      // Expand using full name first, then fallback to base name
      const inherited = PERMISSION_INHERITANCE[p.full] || PERMISSION_INHERITANCE[p.base];
      if (inherited) {
        inherited.forEach((ih) => {
          expanded.add(ih);
          // Also prefix inherited if it's not already
          if (!ih.includes('.')) {
              expanded.add(`${p.full.split('.')[0]}.${ih}`);
          } else if (ih.split('.').length === 2) {
              expanded.add(`${p.full.split('.')[0]}.${ih}`);
          }
        });
      }
    });

    // 6. Check if required permission is in expanded set
    const searchFull = `${moduleType.toLowerCase()}.${resourceSearch}.${actionSearch}`;
    const searchBase = `${resourceSearch}.${actionSearch}`;
    
    return expanded.has(searchFull) || expanded.has(searchBase);
  }

  // Cache Invalidation (Phase 5: Broadcast via Redis Pub/Sub)
  async invalidateUserPermissions(userId: string, tenantId: string) {
    // Clear both individual check cache and consolidated set cache
    await this.cacheService.invalidatePattern(`perm:${userId}:${tenantId}:*`);
    await this.cacheService.invalidatePattern(`user_permissions:${tenantId}:${userId}:*`);
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
   * Optimization: Caches the final expanded set in Redis for 1 hour.
   */
  async getConsolidatedPermissions(
    userId: string,
    tenantId: string,
    shopId?: string | null,
  ): Promise<string[]> {
    const cacheKey = `user_perms:${tenantId}:${userId}:${shopId || 'global'}`;
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    const permissions = await this.getConsolidatedPermissionsFromDB(userId, tenantId, shopId);
    
    // Cache for 1 hour (Distributable via Redis)
    await this.cacheService.set(cacheKey, permissions, 1000 * 60 * 60);
    return permissions;
  }

  /**
   * Diagnostic method to explain why access was granted or denied
   */
  async evaluateAccess(
    userId: string, 
    tenantId: string, 
    moduleType: ModuleType, 
    resource: string, 
    action: string,
    shopId: string | null = null
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const userTenant = await this.prisma.userTenant.findFirst({ where: { userId, tenantId } });
    
    const required = `${moduleType.toLowerCase()}.${resource}.${action}`;
    const requiredBase = `${resource}.${action}`;

    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
        const sensitiveResources = ['sale', 'purchase', 'ledger', 'expense', 'quotation', 'receipt', 'voucher'];
        const isSensitive = sensitiveResources.includes(resource.toLowerCase());
        return {
            allowed: !isSensitive,
            reason: isSensitive ? 'Platform Admin Restricted (Privacy Policy)' : 'Platform Admin Bypass',
            role: user.role,
            required
        };
    }

    if (userTenant?.isSystemOwner || userTenant?.role === 'OWNER') {
        return { allowed: true, reason: 'Tenant Owner Bypass', role: 'OWNER', required };
    }

    const perms = await this.getConsolidatedPermissions(userId, tenantId, shopId);
    const hasAccess = perms.includes(required) || perms.includes(requiredBase) || perms.includes('*');

    return {
        allowed: hasAccess,
        reason: hasAccess ? 'Permission found in expanded set' : 'Required permission not found in user role',
        required,
        userPermissionsCount: perms.length,
        permsPreview: perms.slice(0, 10)
    };
  }

  private async getConsolidatedPermissionsFromDB(
    userId: string,
    tenantId: string,
    shopId?: string | null,
  ): Promise<string[]> {
    // 1. Platform-wide / Tenant Owner = Super Admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const userTenant = await this.prisma.userTenant.findFirst({
      where: { userId, tenantId, deletedAt: null },
    });

    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || userTenant?.isSystemOwner || userTenant?.role === 'OWNER') {
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
      const module = m.permission.resource.moduleType.toLowerCase();
      const resource = m.permission.resource.name;
      const action = m.permission.action;
      
      const fullPerm = `${module}.${resource}.${action}`;
      perms.add(fullPerm);

      // Expand inheritance using the 3-segment format
      if (PERMISSION_INHERITANCE[fullPerm]) {
        PERMISSION_INHERITANCE[fullPerm].forEach((inherited) => {
          // Add granular permission (resource.action)
          perms.add(inherited);
          // Also add with module prefix for frontend clarity
          perms.add(`${module}.${inherited}`);
        });
      }
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
          { tenantId: null, deletedAt: null },
          { tenantId, deletedAt: null },
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
        const parts = pStr.split('.');
        if (parts.length < 2) continue;
        
        const module = parts[0].toUpperCase();
        const moduleType = (module === 'CORE' ? 'CORE' : (module === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : (module === 'GYM' ? 'GYM' : module))) as ModuleType;
        
        if (!allowedModules.includes(moduleType)) {
          throw new ForbiddenException(
            `Cannot assign permissions for unentitled module: ${moduleType}`,
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
            const parts = pStr.split('.');
            if (parts.length === 3) {
              const [mod, res, act] = parts;
              return {
                action: act,
                resource: {
                  name: res,
                  moduleType: mod.toUpperCase() as ModuleType,
                },
              };
            } else if (parts.length === 2) {
              const [res, act] = parts;
              return {
                action: act,
                resource: { name: res },
              };
            }
            return { id: 'invalid' };
          }),
        },
      });
      validPermissionIds.push(...Array.from(new Set(dbPerms.map((p) => p.id))));
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
        const parts = pStr.split('.');
        if (parts.length < 2) continue;
        
        const module = parts[0].toUpperCase();
        const moduleType = (module === 'CORE' ? 'CORE' : (module === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : (module === 'GYM' ? 'GYM' : module))) as ModuleType;

        if (!allowedModules.includes(moduleType)) {
          throw new ForbiddenException(
            `Cannot assign permissions for unentitled module: ${moduleType}`,
          );
        }
      }
    }

    const validPermissionIds: string[] = [];
    if (data.permissions && data.permissions.length > 0) {
      const dbPerms = await this.prisma.permission.findMany({
        where: {
          OR: data.permissions.map((pStr) => {
            const parts = pStr.split('.');
            if (parts.length === 3) {
              const [mod, res, act] = parts;
              return {
                action: act,
                resource: {
                  name: res,
                  moduleType: mod.toUpperCase() as ModuleType,
                },
              };
            } else if (parts.length === 2) {
              const [res, act] = parts;
              return {
                action: act,
                resource: { name: res },
              };
            }
            return { id: 'invalid' };
          }),
        },
      });
      validPermissionIds.push(...Array.from(new Set(dbPerms.map((p) => p.id))));
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

  async listRoleTemplates() {
    return this.prisma.role.findMany({
      where: {
        isSystem: true,
        tenantId: null,
        deletedAt: null,
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
    });
  }

  async listModules() {
    const resources = await this.prisma.resource.findMany({
      include: { permissions: true },
    });

    // Group by moduleType
    const modules: Record<string, any> = {};
    resources.forEach((r) => {
      const mod = r.moduleType;
      if (!modules[mod]) {
        modules[mod] = {
          moduleType: mod,
          resources: [],
        };
      }
      modules[mod].resources.push({
        resourceName: r.name,
        actions: r.permissions.map((p) => p.action),
      });
    });

    return Object.values(modules);
  }

  async getPermissionMatrix() {
    const roles = await this.prisma.role.findMany({
      where: { isSystem: true, tenantId: null, deletedAt: null },
      include: {
        rolePermissions: {
          include: {
            permission: {
              include: { resource: true },
            },
          },
        },
      },
    });

    return roles.map((role) => {
      const basePermissions = role.rolePermissions.map(
        (rp) => `${rp.permission.resource.name}.${rp.permission.action}`,
      );

      const expandedPermissions = this.expandPermissions(basePermissions);

      return {
        role: role.name,
        base: basePermissions,
        expanded: expandedPermissions,
      };
    });
  }
}
