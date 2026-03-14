import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin.decorator';
import { AdminRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../auth/decorators/module-scope.decorator';
import { RequirePermission, ModulePermission } from '../../permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { GranularPermissionGuard } from '../../permissions/guards/granular-permission.guard';
import { TenantIntelligenceService } from './tenant-intelligence.service';

@Controller('admin/tenant-intelligence')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, AdminRolesGuard, GranularPermissionGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN)
export class TenantIntelligenceController {
  constructor(private readonly svc: TenantIntelligenceService) {}

  /** All tenants with health scores — paginated, filterable */
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('scores')
  getTenantScores(
    @Query('page') page = '1',
    @Query('limit') limit = '25',
    @Query('search') search?: string,
    @Query('churnRisk') churnRisk?: string,
    @Query('product') product?: string,
  ) {
    return this.svc.getTenantScores({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      churnRisk,
      product,
    });
  }

  /** HIGH + CRITICAL risk tenants sorted by MRR impact */
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('churn-risks')
  getChurnRisks() {
    return this.svc.getChurnRisks();
  }

  /** Score distribution across the platform */
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('distribution')
  getHealthDistribution() {
    return this.svc.getHealthDistribution();
  }

  /** Feature adoption heatmap — per-tenant × feature usage matrix */
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('feature-adoption')
  getFeatureAdoption(
    @Query('dateRange') dateRange: '7d' | '30d' | '90d' = '30d',
    @Query('product') product?: string,
  ) {
    return this.svc.getFeatureAdoption(dateRange, product);
  }

  /** Full intelligence profile for one tenant */
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get(':tenantId')
  getTenantProfile(@Param('tenantId') tenantId: string) {
    return this.svc.getTenantProfile(tenantId);
  }
}
