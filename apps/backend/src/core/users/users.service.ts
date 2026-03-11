import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole, StaffInviteStatus } from '@prisma/client';
import { normalizePhone } from '../../common/utils/phone.util';
import { PermissionService } from '../permissions/permissions.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  // 🔹 Get user by ID
  async findById(userId: string) {
    if (!userId) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // 🔹 Get users by tenant
  async findByTenant(tenantId: string) {
    return this.prisma.userTenant.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  // 🔹 Get current user with tenant context (for /users/me)
  async getMeWithTenant(userId: string) {
    if (!userId) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userTenant = await this.prisma.userTenant.findFirst({
      where: { userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            tenantType: true,
            enabledModules: true,
            businessType: true,
            businessCategory: {
              select: {
                isComingSoon: true,
              },
            },
          },
        },
      },
    });

    const isSystemOwner =
      userTenant?.isSystemOwner ?? userTenant?.role === UserRole.OWNER;
    let grantedPermissions: string[] = [];

    if (isSystemOwner) {
      grantedPermissions = ['*'];
    } else if (userTenant) {
      grantedPermissions = await this.permissionService.getConsolidatedPermissions(
        userId,
        userTenant.tenantId,
      );
    }

    // Check for pending invite
    let invite: { id: string } | null = null;
    if (user.email) {
      invite = await this.prisma.staffInvite.findFirst({
        where: {
          email: user.email,
          status: StaffInviteStatus.PENDING,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: { id: true },
      });
    }

    return {
      ...user,
      name: user.fullName, // Map for frontend

      // EFFECTIVE CONTEXT
      role: userTenant?.role ?? UserRole.USER,
      tenantId: userTenant?.tenantId ?? null,
      tenantType: userTenant?.tenant?.tenantType ?? null,
      tenantName: userTenant?.tenant?.name ?? null,
      businessType: userTenant?.tenant?.businessType ?? null,
      isComingSoon: userTenant?.tenant?.businessCategory?.isComingSoon ?? false,
      isSystemOwner,
      enabledModules: userTenant?.tenant?.enabledModules ?? [],
      permissions: grantedPermissions, // Map for frontend
      inviteToken: invite?.id ?? null,
    };
  }

  // 🔹 Create STAFF user (used by staff invite / admin)

  // 🔹 Update user profile (name / avatar)
  // 🔹 Update user profile (name / phone)
  async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      phone?: string;
      avatar?: string;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        avatar: data.avatar, // ✅ ADD THIS
        phone: data.phone ? normalizePhone(data.phone) : undefined,
      },
    });
  }
}
