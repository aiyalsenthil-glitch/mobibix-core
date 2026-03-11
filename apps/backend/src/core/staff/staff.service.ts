import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, StaffInviteStatus } from '@prisma/client';
import { PLAN_CAPABILITIES } from '../billing/plan-capabilities';
import {
  excludeDeleted,
  softDeleteData,
  restoreData,
} from '../soft-delete/soft-delete.helper';
import { getCreateAudit, getUpdateAudit } from '../audit/audit.helper';
import { PlanRulesService } from '../billing/plan-rules.service';
import { ModuleType } from '@prisma/client';

import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
import { ROLE_PERMISSIONS } from '../auth/permissions.map';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly planRulesService: PlanRulesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
  ) {}

  // Ensure plan allows staff management (PLUS / PRO)
  private async ensureStaffAllowed(tenantId: string) {
    // Determine module scope (staff removal/creation usually happens in context of a module)
    // For now we assume GYM as primary if not specified, or fallback to the tenant's first active module
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledModules: true, tenantType: true },
    });

    const module =
      tenant?.enabledModules?.[0] ||
      ((tenant as any)?.tenantType === 'MOBILE_SHOP'
        ? ModuleType.MOBILE_SHOP
        : ModuleType.GYM);

    // 1. Check for Downgrade Bypass (already over limit)
    await this.planRulesService.checkRuntimeLimits(tenantId, module);

    // 2. Check Plan Rules for staff permission and specific "add" limit
    const rules = await this.planRulesService.getPlanRulesForTenant(tenantId, module);

    if (!rules) {
      throw new ForbiddenException('No active subscription found. Please upgrade.');
    }

    if (rules.maxStaff === 0) {
      throw new ForbiddenException('Staff management is not allowed in your current plan');
    }

    // Enforce staff count limit for NEW members
    const currentStaffCount = await this.prisma.userTenant.count({
      where: {
        tenantId,
        role: UserRole.STAFF,
        deletedAt: null, // Only active staff
      },
    });

    if (rules.maxStaff !== null && currentStaffCount >= rules.maxStaff) {
      throw new ForbiddenException(
        `Staff limit reached (${currentStaffCount}/${rules.maxStaff}) for your current plan`,
      );
    }
  }

  // List staff for tenant
  async listStaff(
    tenantId: string,
    options?: { skip?: number; take?: number; search?: string },
  ) {
    const where: any = {
      tenantId,
      role: UserRole.STAFF,
      user: {
        deletedAt: null, // Filter at query level for performance
      },
    };

    // Add search filter if provided
    if (options?.search) {
      where.user = {
        ...where.user,
        OR: [
          { fullName: { contains: options.search, mode: 'insensitive' } },
          { email: { contains: options.search, mode: 'insensitive' } },
        ],
      };
    }

    // Parallel queries for better performance
    const [staff, total] = await Promise.all([
      this.prisma.userTenant.findMany({
        where,
        skip: options?.skip ?? 0,
        take: options?.take ?? 50,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
              shopStaffs: {
                where: { tenantId, deletedAt: null },
                include: { dynamicRole: true },
                take: 1, // Get the primary/first role
              },
            },
          },
        },
      }),
      this.prisma.userTenant.count({ where }),
    ]);

    return {
      data: staff.map((s) => {
        const primaryShopStaff = s.user.shopStaffs[0];
        const roleName = primaryShopStaff?.dynamicRole?.name || s.role;
        
        return {
          id: s.user.id,
          email: s.user.email,
          fullName: s.user.fullName,
          phone: s.user.phone,
          role: roleName,
        };
      }),
      total,
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    };
  }

  async acceptInvite(userId: string, targetToken: string) {
    // SECURITY: Use inviteToken instead of ID
    const invite = await this.prisma.staffInvite.findUnique({
      where: { inviteToken: targetToken },
    });

    if (!invite || invite.status !== StaffInviteStatus.PENDING || (invite.expiresAt && invite.expiresAt < new Date())) {
      throw new BadRequestException('Invalid or expired invite');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });

    const ut = await this.prisma.$transaction(async (tx) => {
      const userTenant = await tx.userTenant.upsert({
        where: {
          userId_tenantId: {
            userId: userId,
            tenantId: invite.tenantId,
          },
        },
        update: {
          role: UserRole.STAFF,
        },
        create: {
          userId: userId,
          tenantId: invite.tenantId,
          role: UserRole.STAFF,
        },
      });

      // Fix: Move shop staff creations INSIDE the transaction
      if (invite.shopIds && invite.shopIds.length > 0) {
        await Promise.all(
          invite.shopIds.map((shopId: string) =>
            tx.shopStaff.upsert({
              where: {
                userId_tenantId_shopId: {
                  userId,
                  tenantId: invite.tenantId,
                  shopId: shopId,
                },
              },
              update: {
                roleId: invite.roleId || null,
                isActive: true,
              },
              create: {
                userId,
                tenantId: invite.tenantId,
                shopId: shopId,
                roleId: invite.roleId || null,
                role: UserRole.STAFF,
              },
            }),
          ),
        );
      }

      await tx.staffInvite.update({
        where: { id: invite.id },
        data: { status: StaffInviteStatus.ACCEPTED },
      });

      return userTenant;
    });

    // Audit Log: STAFF_INVITE_ACCEPTED
    await this.auditService.log({
      tenantId: invite.tenantId,
      userId: userId,
      action: 'STAFF_INVITE_ACCEPTED',
      entity: 'StaffInvite',
      entityId: invite.id,
      meta: { email: invite.email },
    });

    // Issue new JWT with branch access
    const jwtPayload = {
      sub: userId,
      tenantId: invite.tenantId,
      userTenantId: ut.id,
      role: UserRole.STAFF,
      isSystemOwner: false,
      tokenVersion: user?.tokenVersion ?? 1,
      permissions: ROLE_PERMISSIONS[UserRole.STAFF] || [],
    };

    return {
      accessToken: this.jwtService.sign(jwtPayload),
      tenantId: invite.tenantId,
    };
  }

  // Reject invite
  async rejectInvite(userId: string, targetToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const invite = await this.prisma.staffInvite.findUnique({
      where: { inviteToken: targetToken },
    });

    if (!invite || invite.email.toLowerCase() !== user?.email?.toLowerCase()) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status === StaffInviteStatus.ACCEPTED) {
      throw new BadRequestException('Cannot reject an already accepted invite');
    }

    // Notify Owner
    this.eventEmitter.emit('staff.invite.rejected', {
      tenantId: invite.tenantId,
      email: invite.email,
    });

    // Audit Log: STAFF_INVITE_REJECTED
    await this.auditService.log({
      tenantId: invite.tenantId,
      userId: userId,
      action: 'STAFF_INVITE_REJECTED',
      entity: 'StaffInvite',
      entityId: invite.id,
      meta: { email: invite.email },
    });

    // Mark as REJECTED (Do not delete for audit)
    await this.prisma.staffInvite.update({
      where: { id: invite.id },
      data: { status: StaffInviteStatus.REJECTED },
    });

    return { success: true };
  }

  // Create staff (attach existing user to tenant)
  async createStaff(
    tenantId: string,
    creatorId: string,
    data: {
      REMOVED_AUTH_PROVIDERUid: string;
      email?: string;
      fullName?: string;
      shopId?: string; // option for branch assignment
    },
  ) {
    await this.ensureStaffAllowed(tenantId);

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ REMOVED_AUTH_PROVIDERUid: data.REMOVED_AUTH_PROVIDERUid }, { email: data.email }],
      },
    });

    if (!existingUser) {
      throw new BadRequestException('User does not exist');
    }

    // Attach user as STAFF with audit trail
    await this.prisma.userTenant.upsert({
      where: {
        userId_tenantId: {
          userId: existingUser.id,
          tenantId,
        },
      },
      update: {
        role: UserRole.STAFF,
        ...getUpdateAudit(creatorId),
      },
      create: {
        userId: existingUser.id,
        tenantId,
        role: UserRole.STAFF,
        ...getCreateAudit(creatorId),
      },
    });
    // MOBILE ERP ONLY: assign staff to shop
    if (data.shopId) {
      await this.prisma.shopStaff.upsert({
        where: {
          userId_tenantId_shopId: {
            userId: existingUser.id,
            tenantId,
            shopId: data.shopId,
          },
        },
        update: {
          isActive: true,
        },
        create: {
          tenantId,
          userId: existingUser.id,
          shopId: data.shopId,
          role: UserRole.STAFF,
        },
      });
    }

    // Mark pending invites as ACCEPTED for audit history
    if (existingUser.email) {
      await this.prisma.staffInvite.updateMany({
        where: {
          tenantId,
          email: existingUser.email,
          status: StaffInviteStatus.PENDING,
        },
        data: {
          status: StaffInviteStatus.ACCEPTED,
          updatedAt: new Date(),
        },
      });
    }

    return { success: true };
  }

  // Invite staff by email
  async inviteByEmail(
    tenantId: string,
    creatorId: string,
    email: string,
    name?: string,
    phone?: string,
    roleId?: string,
    branchIds?: string[],
  ) {
    await this.ensureStaffAllowed(tenantId);
    const normalizedEmail = email.toLowerCase();

    // check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // SAAS FLOW: Check if user is already an OWNER of a MOBILE_SHOP
      const existingOwnerStatus = await this.prisma.userTenant.findFirst({
        where: {
          userId: existingUser.id,
          role: UserRole.OWNER,
          tenant: {
            tenantType: 'MOBILE_SHOP',
          },
        },
      });

      if (existingOwnerStatus) {
        throw new BadRequestException(
          'You cannot invite another shop owner as staff. Please use a different email ID.',
        );
      }

      const exists = await this.prisma.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: existingUser.id,
            tenantId,
          },
        },
      });

      if (exists) {
        return {
          status: 'ALREADY_JOINED',
          message: 'User is already staff in this shop',
        };
      }
    }

    // DUPLICATE CHECK: Only one PENDING invite per tenant + email
    const existingPendingInvite = await this.prisma.staffInvite.findFirst({
      where: {
        tenantId,
        email: normalizedEmail,
        status: StaffInviteStatus.PENDING,
        OR: [
          { expiresAt: { gt: new Date() } },
          { expiresAt: null },
        ],
      },
    });

    if (existingPendingInvite) {
      throw new BadRequestException('User already has a pending valid invitation.');
    }

    // allow re-invite if user exists but has no tenant
    const sanitizedRoleId = roleId === '' ? null : roleId;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days

    const invite = await this.prisma.staffInvite.upsert({
      where: {
        invite_composite_key: {
          tenantId,
          email: normalizedEmail,
          status: StaffInviteStatus.PENDING,
        },
      },
      update: {
        status: StaffInviteStatus.PENDING, // ensure pending
        createdAt: new Date(), // refresh timestamp (optional)
        name,
        phone,
        roleId: sanitizedRoleId,
        shopIds: branchIds || [],
        expiresAt,
      },

      create: {
        tenantId,
        email: normalizedEmail,
        name,
        phone,
        roleId: sanitizedRoleId,
        shopIds: branchIds || [],
        role: UserRole.STAFF,
        expiresAt,
      },
    });

    // Audit Log: STAFF_INVITED
    await this.auditService.log({
      tenantId,
      userId: creatorId,
      action: 'STAFF_INVITED',
      entity: 'StaffInvite',
      entityId: invite.id,
      meta: { email: normalizedEmail, roleId: sanitizedRoleId },
    });
  }

  // List staff invites
  async listInvites(tenantId: string) {
    const invites = await this.prisma.staffInvite.findMany({
      where: {
        tenantId,
        status: StaffInviteStatus.PENDING,
      },
      include: {
        dynamicRole: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invites.map((i) => ({
      ...i,
      role: i.dynamicRole?.name || i.role,
    }));
  }

  // Revoke invite
  async revokeInvite(tenantId: string, inviteId: string) {
    await this.ensureStaffAllowed(tenantId);

    const invite = await this.prisma.staffInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.tenantId !== tenantId) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status === StaffInviteStatus.ACCEPTED) {
      throw new ForbiddenException('Cannot revoke accepted invite');
    }

    await this.prisma.staffInvite.update({
      where: { id: inviteId },
      data: { status: StaffInviteStatus.REJECTED }, // or REVOKED, using REJECTED for now
    });

    return { success: true };
  }
  // Remove staff from tenant (soft delete)
  async removeStaff(
    tenantId: string,
    staffUserId: string,
    requesterUserId?: string,
  ) {
    // Prevent self-removal
    if (staffUserId === requesterUserId) {
      throw new ForbiddenException(
        'Owner cannot remove themselves from their own tenant',
      );
    }

    const staffRelation = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: staffUserId,
          tenantId,
        },
      },
    });

    if (!staffRelation) {
      throw new NotFoundException('Staff not found in this tenant context');
    }

    // Prevent removing OWNER
    if (staffRelation.role === UserRole.OWNER) {
      throw new ForbiddenException(
        'Cannot remove the shop owner via staff management',
      );
    }

    // SAAS FIX: Only remove the RELATIONSHIP, not the User account itself
    await this.prisma.$transaction([
      // 1. Soft delete tenant access
      this.prisma.userTenant.update({
        where: { id: staffRelation.id },
        data: {
          deletedAt: new Date(),
        },
      }),
      // 2. Clear branch assignments
      this.prisma.shopStaff.updateMany({
        where: {
          tenantId,
          userId: staffUserId,
        },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      }),
    ]);

    return { success: true };
  }
}
