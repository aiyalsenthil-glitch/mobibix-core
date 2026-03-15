import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../../../core/auth/guards/tenant.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission } from '../../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../../security/permission-registry';
import { InventoryIntelligenceService } from './inventory-intelligence.service';
import { InventoryIntelligenceQueryDto } from './dto/inventory-intelligence-query.dto';

@Controller('reports/inventory-intelligence')
@ModuleScope(ModuleType.MOBILE_SHOP)
@RequirePermission(PERMISSIONS.CORE.REPORT.INVENTORY_VIEW)
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class InventoryIntelligenceController {
  constructor(private readonly svc: InventoryIntelligenceService) {}

  /** GET /reports/inventory-intelligence — full dashboard payload (single call) */
  @Get()
  getAll(@Request() req: any, @Query() query: InventoryIntelligenceQueryDto) {
    return this.svc.getAll(req.user.tenantId, query);
  }

  /** GET /reports/inventory-intelligence/overview */
  @Get('overview')
  getOverview(@Request() req: any, @Query() query: InventoryIntelligenceQueryDto) {
    return this.svc.getOverview(req.user.tenantId, query);
  }

  /** GET /reports/inventory-intelligence/top-loss-products */
  @Get('top-loss-products')
  getTopLossProducts(@Request() req: any, @Query() query: InventoryIntelligenceQueryDto) {
    return this.svc.getTopLossProducts(req.user.tenantId, query);
  }

  /** GET /reports/inventory-intelligence/loss-by-category */
  @Get('loss-by-category')
  getLossByCategory(@Request() req: any, @Query() query: InventoryIntelligenceQueryDto) {
    return this.svc.getLossByCategory(req.user.tenantId, query);
  }

  /** GET /reports/inventory-intelligence/monthly-loss-trend */
  @Get('monthly-loss-trend')
  getMonthlyLossTrend(@Request() req: any, @Query() query: InventoryIntelligenceQueryDto) {
    return this.svc.getMonthlyLossTrend(req.user.tenantId, query);
  }

  /** GET /reports/inventory-intelligence/reason-breakdown */
  @Get('reason-breakdown')
  getReasonBreakdown(@Request() req: any, @Query() query: InventoryIntelligenceQueryDto) {
    return this.svc.getReasonBreakdown(req.user.tenantId, query);
  }

  /** GET /reports/inventory-intelligence/insights */
  @Get('insights')
  getInsights(@Request() req: any, @Query() query: InventoryIntelligenceQueryDto) {
    return this.svc.generateInsights(req.user.tenantId, query);
  }
}
