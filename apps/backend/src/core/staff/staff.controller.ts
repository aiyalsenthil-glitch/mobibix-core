import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { PrismaService } from '../prisma/prisma.service';
import { Permission } from '../auth/permissions.enum';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard) // ✅ ENSURE RolesGuard IS APPLIED
@Roles(Role.OWNER)
export class StaffController {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // ADD STAFF (OWNER)
  // ─────────────────────────────────────────────
  @Post()
  async addStaff(@Req() req: any, @Body() body: { email: string }) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant not found');
    }

    const email = body.email.toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: Role.STAFF,
          tenantId,
          permissions: [], // 🔒 no permissions by default
        },
      });

      return { message: 'Staff added successfully' };
    }

    await this.prisma.staffInvite.create({
      data: {
        email,
        tenantId,
      },
    });

    return {
      message: 'Invite created. Staff can sign up using this email.',
    };
  }

  // ─────────────────────────────────────────────
  // UPDATE STAFF PERMISSIONS (OWNER)
  // ─────────────────────────────────────────────
  @Patch(':id/permissions')
  async updatePermissions(
    @Req() req: any,
    @Param('id') staffId: string,
    @Body() body: { permissions: Permission[] },
  ) {
    return this.prisma.user.updateMany({
      where: {
        id: staffId,
        tenantId: req.user.tenantId,
        role: Role.STAFF,
      },
      data: {
        permissions: body.permissions,
      },
    });
  }

  @Get()
  async listStaff(@Req() req: any) {
    return this.prisma.user.findMany({
      where: {
        tenantId: req.user.tenantId,
        role: Role.STAFF,
      },
      select: {
        id: true,
        email: true,
        permissions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
