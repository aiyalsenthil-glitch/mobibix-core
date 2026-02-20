import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
  Delete,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { StaffService } from './staff.service';
import { Permission } from '../auth/permissions.enum';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  PlanFeatureGuard,
  RequirePlanFeature,
} from '../billing/guards/plan-feature.guard';
import { ModuleType } from '@prisma/client';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { BranchAccessGuard } from '../permissions/guards/branch-access.guard';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, BranchAccessGuard, GranularPermissionGuard)
export class StaffController {
  constructor(
    private readonly staffService: StaffService, // ✅ inject
  ) {}

  // ✅ OWNER: list staff
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.STAFF_MANAGE)
  @RequirePermission(ModuleType.CORE, 'staff', 'view_all')
  @Get()
  listStaff(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.staffService.listStaff(tenantId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      search,
    });
  }

  // ✅ OWNER: TEMP create staff (staff must have logged in once)
  @UseGuards(JwtAuthGuard, PlanFeatureGuard)
  @RequirePlanFeature('staff')
  @Roles(UserRole.OWNER)
  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      REMOVED_AUTH_PROVIDERUid: string;
      email?: string;
      fullName?: string;
      shopId?: string; // 👈 ADD THIS
    },
  ) {
    return this.staffService.createStaff(req.user.tenantId, req.user.sub, {
      REMOVED_AUTH_PROVIDERUid: body.REMOVED_AUTH_PROVIDERUid,
      email: body.email,
      fullName: body.fullName,
      shopId: body.shopId,
    });
  }

  // ✅ OWNER: INVITE staff by email (PROPER FLOW)
  @Roles(UserRole.OWNER)
  @Post('invite')
  async invite(
    @Req() req: any,
    @Body() body: { email: string; name?: string; phone?: string },
  ) {
    return this.staffService.inviteByEmail(
      req.user.tenantId,
      req.user.sub,
      body.email,
      body.name,
      body.phone,
    );
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
  // ✅ OWNER: Remove staff from tenant
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.STAFF_MANAGE)
  @Delete(':staffUserId')
  async removeStaff(
    @Req() req: any,
    @Param('staffUserId') staffUserId: string,
  ) {
    return this.staffService.removeStaff(
      req.user.tenantId,
      staffUserId,
      req.user.id,
    );
  }
}
