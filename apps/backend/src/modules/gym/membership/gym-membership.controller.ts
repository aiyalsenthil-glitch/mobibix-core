import { Controller, Post, Get, Req, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { GymMembershipService } from './gym-membership.service';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';

@Controller('gym/memberships')
@ModuleScope(ModuleType.GYM)
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class GymMembershipController {
  constructor(private readonly service: GymMembershipService) {}

  @Permissions(Permission.MEMBERSHIP_CREATE)
  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.service.createMembership(
      req.user.tenantId,
      dto.memberId,
      dto.durationDays,
    );
  }

  @Permissions(Permission.MEMBER_VIEW)
  @Get('expiring')
  expiring(@Req() req: any) {
    return this.service.getExpiringMemberships(req.user.tenantId);
  }
}
