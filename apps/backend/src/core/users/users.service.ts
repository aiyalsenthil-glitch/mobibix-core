import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { normalizePhone } from '../../common/utils/phone.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
