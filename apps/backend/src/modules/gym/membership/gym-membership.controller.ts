import { Controller, Post, Get, Req, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { GymMembershipService } from './gym-membership.service';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';

@Controller('gym/memberships')
@ModuleScope(ModuleType.GYM)
@ModulePermission('membership')
@UseGuards(
  JwtAuthGuard,
  TenantRequiredGuard,
  RolesGuard,
  GranularPermissionGuard
)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class GymMembershipController {
  constructor(private readonly service: GymMembershipService) {}

  @RequirePermission(PERMISSIONS.GYM.MEMBERSHIP.CREATE)
  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.service.createMembership(
      req.user.tenantId,
      dto.memberId,
      dto.durationDays,
    );
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBERSHIP.VIEW)
  @Get('expiring')
  expiring(@Req() req: any) {
    return this.service.getExpiringMemberships(req.user.tenantId);
  }
}
