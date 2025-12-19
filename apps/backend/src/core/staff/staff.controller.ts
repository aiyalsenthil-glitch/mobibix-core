import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { PrismaService } from '../prisma/prisma.service';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class StaffController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async addStaff(@Req() req: any, @Body() body: { email: string }) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant not found');
    }

    const email = body.email.toLowerCase();

    // 1️⃣ Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      // Assign as staff immediately
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: Role.STAFF,
          tenantId,
        },
      });

      return { message: 'Staff added successfully' };
    }

    // 2️⃣ Create invite if user does not exist
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
}
