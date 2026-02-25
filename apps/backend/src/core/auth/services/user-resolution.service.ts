import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UserResolutionService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUser(decodedToken: any) {
    let user = await this.prisma.user.findUnique({
      where: { REMOVED_AUTH_PROVIDERUid: decodedToken.uid },
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

    if (!user) {
      const normalizedEmail = decodedToken.email?.toLowerCase() ?? null;
      user = await this.prisma.user.create({
        data: {
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
    } else {
      // Async update user meta if changed
      const needsUpdate =
        (decodedToken.email && user.email !== decodedToken.email) ||
        (decodedToken.name && user.fullName !== decodedToken.name);

      if (needsUpdate) {
        const normalizedEmail = decodedToken.email?.toLowerCase() ?? user.email;
        this.prisma.user
          .update({
            where: { id: user.id },
            data: {
              email: normalizedEmail,
              fullName: decodedToken.name ?? user.fullName,
            },
          })
          .catch((e) =>
            console.warn('⚠️  Failed to update user meta:', e.message),
          );
      } else if (user.email && user.email !== user.email.toLowerCase()) {
        // Proactively normalize existing user email if mixed case
        this.prisma.user
          .update({
            where: { id: user.id },
            data: { email: user.email.toLowerCase() },
          })
          .catch(() => null);
      }
    }

    return user;
  }

  async checkInvites(email?: string) {
    if (!email) return null;
    return this.prisma.staffInvite.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        accepted: false,
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
          data: { accepted: true },
        }),
      ]);
    } catch (err: any) {
      console.warn('⚠️  Failed to accept staff invite:', err?.message);
    }
  }
}
