import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { PLAN_CAPABILITIES } from '../billing/plan-capabilities';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

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

    if (currentStaffCount >= capability.maxStaff) {
      throw new ForbiddenException('Staff limit reached for your current plan');
    }

    return subscription;
  }

  // ✅ List staff for tenant
  async listStaff(tenantId: string) {
    const staff = await this.prisma.userTenant.findMany({
      where: {
        tenantId,
        role: UserRole.STAFF,
      },
      include: {
        user: true,
      },
    });

    return staff.map((s) => ({
      id: s.user.id, // 🔥 THIS FIXES EVERYTHING
      email: s.user.email,
      fullName: s.user.fullName,
      phone: s.user.phone,
      role: s.role,
    }));
  }

  // ✅ Create staff (attach existing user to tenant)
  async createStaff(
    tenantId: string,
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

    // ✅ Attach user as STAFF
    await this.prisma.userTenant.upsert({
      where: {
        userId_tenantId: {
          userId: existingUser.id,
          tenantId,
        },
      },
      update: {
        role: UserRole.STAFF,
      },
      create: {
        userId: existingUser.id,
        tenantId,
        role: UserRole.STAFF,
      },
    });
    // 🔹 MOBILE ERP ONLY: assign staff to shop
    if (data.shopId) {
      await this.prisma.shopStaff.upsert({
        where: {
          userId_shopId: {
            userId: existingUser.id,
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
  async inviteByEmail(tenantId: string, email: string) {
    await this.ensureStaffAllowed(tenantId);

    // check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email },
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

    await this.prisma.staffInvite.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
      update: {
        accepted: false, // reset invite
        createdAt: new Date(), // refresh timestamp (optional)
      },

      create: {
        tenantId,
        email,
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
  // ✅ Remove staff from tenant
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
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    // 🔒 Prevent removing OWNER
    if (staff.role === UserRole.OWNER) {
      throw new ForbiddenException('Cannot remove owner');
    }

    await this.prisma.userTenant.delete({
      where: {
        userId_tenantId: {
          userId: staffUserId,
          tenantId,
        },
      },
    });

    return { success: true };
  }
}
