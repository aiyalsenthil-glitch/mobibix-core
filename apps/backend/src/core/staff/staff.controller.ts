import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
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
import { BranchAccessGuard } from '../permissions/guards/branch-access.guard';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { RequirePermission, ModulePermission } from '../permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { Public } from '../auth/decorators/public.decorator';

@Controller('staff')
@ModuleScope(ModuleType.CORE)
@ModulePermission('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService, // inject
  ) {}

  // OWNER: list staff
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
    TenantRequiredGuard,
    BranchAccessGuard,
    GranularPermissionGuard,
  )
  @RequirePermission(PERMISSIONS.CORE.STAFF.VIEW)
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

  // OWNER: create staff (staff must have logged in once) - LEGACY
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
    TenantRequiredGuard,
    BranchAccessGuard,
    GranularPermissionGuard,
    PlanFeatureGuard,
  )
  @RequirePermission(PERMISSIONS.CORE.STAFF.MANAGE)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      REMOVED_AUTH_PROVIDERUid: string;
      email?: string;
      fullName?: string;
      shopId?: string; // option for branch assignment
    },
  ) {
    return this.staffService.createStaff(req.user.tenantId, req.user.sub, {
      REMOVED_AUTH_PROVIDERUid: body.REMOVED_AUTH_PROVIDERUid,
      email: body.email,
      fullName: body.fullName,
      shopId: body.shopId,
    });
  }

  // OWNER: INVITE staff by email
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
    TenantRequiredGuard,
    BranchAccessGuard,
    GranularPermissionGuard,
  )
  @RequirePermission(PERMISSIONS.CORE.STAFF.INVITE)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Post('invite')
  async invite(
    @Req() req: any,
    @Body()
    body: {
      email: string;
      name?: string;
      phone?: string;
      roleId?: string;
      branchIds?: string[];
    },
  ) {
    return this.staffService.inviteByEmail(
      req.user.tenantId,
      req.user.sub,
      body.email,
      body.name,
      body.phone,
      body.roleId,
      body.branchIds,
    );
  }
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
    TenantRequiredGuard,
    BranchAccessGuard,
    GranularPermissionGuard,
  )
  @RequirePermission(PERMISSIONS.CORE.STAFF.VIEW)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get('invites')
  async listInvites(@Req() req: any) {
    return this.staffService.listInvites(req.user.tenantId);
  }

  // USER: Accept an invite (Bypasses TenantRequired & Roles constraints)
  @Public()
  @Post('invite/accept')
  async acceptInvite(@Req() req: any, @Body('token') token: string) {
    const result = await this.staffService.acceptInvite(req.user.sub, token);
    return result;
  }

  @Public()
  @Post('invite/reject')
  async rejectInvite(@Req() req: any, @Body('token') token: string) {
    return this.staffService.rejectInvite(req.user.sub, token);
  }
  //Staff Invite Revoke
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
    TenantRequiredGuard,
    BranchAccessGuard,
    GranularPermissionGuard,
  )
  @RequirePermission(PERMISSIONS.CORE.STAFF.MANAGE)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Delete('invite/:id')
  async revokeInvite(@Req() req: any, @Param('id') inviteId: string) {
    return this.staffService.revokeInvite(req.user.tenantId, inviteId);
  }
  // OWNER: Disable (soft-remove) staff — same as remove but via PATCH for UI semantics
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
    TenantRequiredGuard,
    BranchAccessGuard,
    GranularPermissionGuard,
  )
  @RequirePermission(PERMISSIONS.CORE.STAFF.MANAGE)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':staffUserId/disable')
  async disableStaff(
    @Req() req: any,
    @Param('staffUserId') staffUserId: string,
  ) {
    return this.staffService.removeStaff(
      req.user.tenantId,
      staffUserId,
      req.user.id,
    );
  }

  // OWNER: Remove staff from tenant
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
    TenantRequiredGuard,
    BranchAccessGuard,
    GranularPermissionGuard,
  )
  @RequirePermission(PERMISSIONS.CORE.STAFF.MANAGE)
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
