import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { PLAN_CAPABILITIES } from '../billing/plan-capabilities';
import {
  excludeDeleted,
  softDeleteData,
  restoreData,
} from '../soft-delete/soft-delete.helper';
import { getCreateAudit, getUpdateAudit } from '../audit/audit.helper';

import { JwtService } from '@nestjs/jwt';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  // 🔒 Ensure plan allows staff management (PLUS / PRO)
  private async ensureStaffAllowed(tenantId: string) {
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'No active subscription found. Please upgrade.',
      );
    }
    if (!['ACTIVE', 'TRIAL'].includes(subscription.status)) {
      throw new ForbiddenException(
        'Your subscription is not active. Please upgrade.',
      );
    }

    const planCode = (
      subscription.plan.code ?? subscription.plan.name
    ).toUpperCase();
    const capability = PLAN_CAPABILITIES[planCode];

    if (!capability?.staffAllowed) {
      throw new ForbiddenException(
        'Staff management is not allowed in your current plan',
      );
    }

    // 🔒 Enforce staff count limit
    const currentStaffCount = await this.prisma.userTenant.count({
      where: {
        tenantId,
        role: UserRole.STAFF,
      },
    });
    const maxStaff = subscription.plan.maxStaff;

    // null means unlimited
    if (maxStaff !== null && currentStaffCount >= maxStaff) {
      throw new ForbiddenException(
        `Staff limit reached (${currentStaffCount}/${maxStaff}) for your current plan`,
      );
    }

    return subscription;
  }

  // ✅ List staff for tenant
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
            },
          },
        },
      }),
      this.prisma.userTenant.count({ where }),
    ]);

    return {
      data: staff.map((s) => ({
        id: s.user.id,
        email: s.user.email,
        fullName: s.user.fullName,
        phone: s.user.phone,
        role: s.role,
      })),
      total,
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    };
  }

  // ✅ Accept invite
  async acceptInvite(userId: string, targetToken: string) {
    const invite = await this.prisma.staffInvite.findUnique({
      where: { id: targetToken }
    });

    if (!invite || invite.accepted) {
      throw new BadRequestException('Invalid or expired invite');
    }

    const shopStaffCreations = (invite.shopIds || []).map((shopId: string) => 
      this.prisma.shopStaff.upsert({
        where: {
          userId_tenantId_shopId: {
            userId,
            tenantId: invite.tenantId,
            shopId: shopId,
          }
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
        }
      })
    );

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

      await Promise.all(shopStaffCreations);

      await tx.staffInvite.update({
        where: { id: invite.id },
        data: { accepted: true },
      });

      return userTenant;
    });

    // Issue new JWT with branch access
    const jwtPayload = {
      sub: userId,
      tenantId: invite.tenantId,
      userTenantId: ut.id,
      role: UserRole.STAFF,
    };

    return {
      accessToken: this.jwtService.sign(jwtPayload),
      tenantId: invite.tenantId,
    };
  }

  // ✅ Create staff (attach existing user to tenant)
  async createStaff(
    tenantId: string,
    creatorId: string,
    data: {
      REMOVED_AUTH_PROVIDERUid: string;
      email?: string;
      fullName?: string;
      shopId?: string; // 👈 ADD THIS
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

    // ✅ Attach user as STAFF with audit trail
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
    // 🔹 MOBILE ERP ONLY: assign staff to shop
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

    // 🔥 FIX: remove invite once accepted
    if (existingUser.email) {
      await this.prisma.staffInvite.deleteMany({
        where: {
          tenantId,
          email: existingUser.email,
        },
      });
    }

    return { success: true };
  }

  // ✅ Invite staff by email
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
          message: 'User is already staff in this gym',
        };
      }
    }

    // allow re-invite if user exists but has no tenant
    const sanitizedRoleId = roleId === "" ? null : roleId;

    await this.prisma.staffInvite.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email: normalizedEmail,
        },
      },
      update: {
        accepted: false, // reset invite
        createdAt: new Date(), // refresh timestamp (optional)
        name,
        phone,
        roleId: sanitizedRoleId,
        shopIds: branchIds || [],
      },

      create: {
        tenantId,
        email: normalizedEmail,
        name,
        phone,
        roleId: sanitizedRoleId,
        shopIds: branchIds || [],
        role: UserRole.STAFF,
      },
    });
  }

  // ✅ List staff invites
  async listInvites(tenantId: string) {
    return this.prisma.staffInvite.findMany({
      where: {
        tenantId,
        accepted: false, // 🔥 REQUIRED
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ✅ Revoke invite
  async revokeInvite(tenantId: string, inviteId: string) {
    await this.ensureStaffAllowed(tenantId);

    const invite = await this.prisma.staffInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.tenantId !== tenantId) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.accepted) {
      throw new ForbiddenException('Cannot revoke accepted invite');
    }

    await this.prisma.staffInvite.delete({
      where: { id: inviteId },
    });

    return { success: true };
  }
  // ✅ Remove staff from tenant (soft delete)
  async removeStaff(
    tenantId: string,
    staffUserId: string,
    requesterUserId?: string,
  ) {
    // 🔒 Prevent self-removal
    if (staffUserId === requesterUserId) {
      throw new ForbiddenException('Owner cannot remove themselves');
    }

    const staff = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: staffUserId,
          tenantId,
        },
      },
      include: { user: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    // 🔒 Prevent removing OWNER
    if (staff.role === UserRole.OWNER) {
      throw new ForbiddenException('Cannot remove owner');
    }

    // 🔥 Soft delete the user instead of hard delete
    await this.prisma.user.update({
      where: { id: staffUserId },
      data: softDeleteData(requesterUserId || staffUserId) as any,
    });

    return { success: true };
  }
}
