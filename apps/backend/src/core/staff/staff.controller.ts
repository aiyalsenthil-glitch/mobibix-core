import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRole.OWNER)
  @Get()
  async list(@Req() req: any) {
    return this.usersService.findByTenant(req.user.tenantId);
  }

  @Roles(UserRole.OWNER)
  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      REMOVED_AUTH_PROVIDERUid: string;
      email?: string;
      fullName?: string;
    },
  ) {
    return this.usersService.createStaffUser({
      REMOVED_AUTH_PROVIDERUid: body.REMOVED_AUTH_PROVIDERUid,
      email: body.email ?? null,
      fullName: body.fullName ?? null,
      tenantId: req.user.tenantId,
    });
  }
}
