import {
  Controller, Get, Post, Patch, Delete,
  Req, Body, Param, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { GymPlansService, CreateGymPlanDto, UpdateGymPlanDto } from './gym-plans.service';

@Controller('gym/gym-plans')
@ModuleScope(ModuleType.GYM)
@ModulePermission('member')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class GymPlansController {
  constructor(private readonly plansService: GymPlansService) {}

  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Get()
  list(@Req() req: any) {
    return this.plansService.listPlans(req.user.tenantId);
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.CREATE)
  @Roles(UserRole.OWNER)
  @Post()
  create(@Req() req: any, @Body() dto: CreateGymPlanDto) {
    return this.plansService.createPlan(req.user.tenantId, dto, req.user.sub);
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.CREATE)
  @Roles(UserRole.OWNER)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateGymPlanDto) {
    return this.plansService.updatePlan(req.user.tenantId, id, dto);
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.CREATE)
  @Roles(UserRole.OWNER)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.plansService.deletePlan(req.user.tenantId, id);
  }
}
