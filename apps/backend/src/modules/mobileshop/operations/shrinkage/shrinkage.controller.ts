import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { ShrinkageService } from './shrinkage.service';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../../core/auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../../../../core/permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../../../../core/permissions/guards/granular-permission.guard';
import { TenantRequiredGuard } from '../../../../core/auth/guards/tenant.guard';
import { PERMISSIONS } from '../../../../security/permission-registry';

@Controller('operations/shrinkage')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('shrinkage')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class ShrinkageController {
  constructor(private readonly svc: ShrinkageService) {}

  /**
   * GET /operations/shrinkage/intelligence
   * Full shrinkage report: by category + staff + supplier + reason
   */
  @Get('intelligence')
  @RequirePermission(PERMISSIONS.CORE.SHRINKAGE.VIEW)
  getIntelligence(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.svc.getIntelligenceSummary(user.tenantId, shopId, startDate, endDate);
  }

  /** GET /operations/shrinkage/by-category */
  @Get('by-category')
  @RequirePermission(PERMISSIONS.CORE.SHRINKAGE.VIEW)
  byCategory(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.svc.lossByCategory(user.tenantId, shopId, startDate, endDate);
  }

  /** GET /operations/shrinkage/by-staff */
  @Get('by-staff')
  @RequirePermission(PERMISSIONS.CORE.SHRINKAGE.VIEW)
  byStaff(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.svc.lossByStaff(user.tenantId, shopId, startDate, endDate);
  }

  /** GET /operations/shrinkage/by-supplier */
  @Get('by-supplier')
  @RequirePermission(PERMISSIONS.CORE.SHRINKAGE.VIEW)
  bySupplier(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.svc.lossBySupplier(user.tenantId, shopId, startDate, endDate);
  }

  /** GET /operations/shrinkage/by-reason */
  @Get('by-reason')
  @RequirePermission(PERMISSIONS.CORE.SHRINKAGE.VIEW)
  byReason(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.svc.lossReasonBreakdown(user.tenantId, shopId, startDate, endDate);
  }
}
