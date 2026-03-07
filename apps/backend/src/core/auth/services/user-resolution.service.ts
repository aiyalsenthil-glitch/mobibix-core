import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, StaffInviteStatus } from '@prisma/client';

@Injectable()
export class UserResolutionService {
  private readonly logger = new Logger(UserResolutionService.name);
  constructor(private readonly prisma: PrismaService) {}

  async resolveUser(decodedToken: any) {
    const normalizedEmail = decodedToken.email?.toLowerCase() ?? null;

    let user = await this.prisma.user.upsert({
      where: { REMOVED_AUTH_PROVIDERUid: decodedToken.uid },
      update: {
        email: normalizedEmail,
        fullName: decodedToken.name ?? undefined,
      },
      create: {
        REMOVED_AUTH_PROVIDERUid: decodedToken.uid,
        email: normalizedEmail,
        fullName: decodedToken.name ?? null,
        role: UserRole.USER,
        tenantId: null,
      },
      include: {
        userTenants: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    return user;
  }

  async checkInvites(email?: string) {
    if (!email) return null;
    return this.prisma.staffInvite.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        status: StaffInviteStatus.PENDING,
        OR: [
          { expiresAt: { gt: new Date() } },
          { expiresAt: null }, // Backwards compatibility
        ],
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  async resolveActiveTenant(user: any, tenantCode?: string) {
    const userTenants = user.userTenants;

    if (tenantCode) {
      const activeTenant = userTenants.find(
        (ut) => ut.tenant.code === tenantCode,
      );

      if (!activeTenant) {
        // Double check if tenant exists at all
        const tenant = await this.prisma.tenant.findUnique({
          where: { code: tenantCode },
          select: { id: true },
        });

        if (!tenant) {
          throw new UnauthorizedException('Tenant code is invalid');
        }
        throw new UnauthorizedException('User is not linked to this tenant');
      }

      return activeTenant;
    }

    // Default to first tenant or null
    return userTenants[0] || null;
  }

  async processStaffInvite(userId: string, staffInvite: any) {
    if (!staffInvite) return;

    try {
      const shopStaffCreations = (staffInvite.shopIds || []).map(
        (shopId: string) =>
          this.prisma.shopStaff.upsert({
            where: {
              userId_tenantId_shopId: {
                userId: userId,
                tenantId: staffInvite.tenantId,
                shopId: shopId,
              },
            },
            update: {
              roleId: staffInvite.roleId || null,
              isActive: true,
            },
            create: {
              userId: userId,
              tenantId: staffInvite.tenantId,
              shopId: shopId,
              roleId: staffInvite.roleId || null,
              role: UserRole.STAFF,
            },
          }),
      );

      await this.prisma.$transaction([
        this.prisma.userTenant.upsert({
          where: {
            userId_tenantId: {
              userId: userId,
              tenantId: staffInvite.tenantId,
            },
          },
          update: {
            role: UserRole.STAFF,
          },
          create: {
            userId: userId,
            tenantId: staffInvite.tenantId,
            role: UserRole.STAFF,
          },
        }),
        ...shopStaffCreations,
        this.prisma.staffInvite.update({
          where: { id: staffInvite.id },
          data: { status: StaffInviteStatus.ACCEPTED },
        }),
      ]);
    } catch (err: any) {
      this.logger.warn(`Failed to accept staff invite: ${err?.message}`);
    }
  }
}
