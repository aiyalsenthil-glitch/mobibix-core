import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { StaffService } from './staff.service';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(
    private readonly usersService: UsersService, // ✅ inject
    private readonly staffService: StaffService, // ✅ inject
  ) {}

  // ✅ OWNER: list staff
  @Roles(UserRole.OWNER)
  @Get()
  async list(@Req() req: any) {
    return this.staffService.listStaff(req.user.tenantId);
  }

  // ✅ OWNER: TEMP create staff (staff must have logged in once)
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

  // ✅ OWNER: INVITE staff by email (PROPER FLOW)
  @Roles(UserRole.OWNER)
  @Post('invite')
  async invite(@Req() req: any, @Body('email') email: string) {
    return this.staffService.inviteByEmail(req.user.tenantId, email);
  }
  @Roles(UserRole.OWNER)
  @Get('invites')
  async listInvites(@Req() req: any) {
    return this.staffService.listInvites(req.user.tenantId);
  }
  //Staff Invite Revoke
  @Roles(UserRole.OWNER)
  @Delete('invite/:id')
  async revokeInvite(@Req() req: any, @Param('id') inviteId: string) {
    return this.staffService.revokeInvite(req.user.tenantId, inviteId);
  }
}
