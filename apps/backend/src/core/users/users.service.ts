// src/core/users/users.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async createUser(tenantId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('User already exists');
    }

    return this.prisma.user.create({
      data: {
        email: dto.email,
        role: typeof dto.role === 'string' ? dto.role.toLowerCase() : dto.role,
        fullName: dto.fullName,
        tenantId,
        REMOVED_AUTH_PROVIDERUid: `pending_${Date.now()}`,
      },
    });
  }

  async listUsers(tenantId: string): Promise<User[]> {
    if (!tenantId) {
      return [];
    }

    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
