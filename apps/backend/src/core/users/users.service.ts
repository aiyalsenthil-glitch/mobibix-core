import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { normalizePhone } from '../../common/utils/phone.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // 🔹 Get user by ID
  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatar: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // 🔹 Get users by tenant
  async findByTenant(tenantId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🔹 Create STAFF user (used by staff invite / admin)
  async createStaffUser(data: {
    REMOVED_AUTH_PROVIDERUid: string;
    email?: string | null;
    fullName?: string | null;
    tenantId: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        REMOVED_AUTH_PROVIDERUid: data.REMOVED_AUTH_PROVIDERUid,
        email: data.email ?? null,
        fullName: data.fullName ?? null,
        tenantId: data.tenantId,
        role: UserRole.STAFF,
      },
    });
  }

  // 🔹 Update user profile (name / avatar)
  // 🔹 Update user profile (name / phone)
  async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      phone?: string;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId }, // ✅ FIXED
      data: {
        fullName: data.fullName,
        phone: data.phone ? normalizePhone(data.phone) : undefined,
      },
    });
  }

  // 🔹 Promote / change role (ADMIN only – future use)
  async updateRole(userId: string, role: UserRole): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }
}
