import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin.decorator';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/system/users')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN)
export class AdminUserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listAdminUsers() {
    const admins = await this.prisma.adminUser.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            REMOVED_AUTH_PROVIDERUid: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return admins.map((a) => ({
      id: a.id,
      userId: a.userId,
      email: a.user?.email,
      fullName: a.user?.fullName,
      role: a.role,
      productScope: a.productScope,
      createdAt: a.createdAt,
    }));
  }

  @Post()
  async addAdminUser(@Body() body: { email: string; role: AdminRole }) {
    if (!body.email || !body.role) {
      throw new BadRequestException('Email and Role are required');
    }

    // 1. Find the base User record by email
    const user = await this.prisma.user.findFirst({
      where: { email: body.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException(
        `User with email ${body.email} not found in platform. Invite them as a staff member first.`,
      );
    }

    // 2. Upsert AdminUser
    return this.prisma.adminUser.upsert({
      where: { userId: user.id },
      update: { role: body.role },
      create: {
        userId: user.id,
        role: body.role,
      },
    });
  }

  @Patch(':id')
  async updateAdminUser(
    @Param('id') id: string,
    @Body() body: { role: AdminRole },
  ) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin user not found');

    return this.prisma.adminUser.update({
      where: { id },
      data: { role: body.role },
    });
  }

  @Delete(':id')
  async removeAdminUser(@Param('id') id: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin user not found');

    // Prevent deleting the last SUPER_ADMIN (simple check)
    if (admin.role === AdminRole.SUPER_ADMIN) {
      const superAdminCount = await this.prisma.adminUser.count({
        where: { role: AdminRole.SUPER_ADMIN },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException('Cannot delete the last Super Admin');
      }
    }

    return this.prisma.adminUser.delete({
      where: { id },
    });
  }

  @Get('roles-list')
  async getAvailableRoles() {
    return Object.values(AdminRole);
  }
}
