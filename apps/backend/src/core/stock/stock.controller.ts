import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { StockService } from './stock.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('mobileshop/stock')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('inventory')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class StockController {
  constructor(private readonly service: StockService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.VIEW)
  @Get('summary')
  async getSummary(@Req() req: any, @Query('shopId') shopId?: string) {
    const tenantId = req.user.tenantId;
    return await this.service.getStockBalances(tenantId, shopId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.VIEW)
  @Get('overview')
  async getOverview(@Req() req: any, @Query('shopId') shopId?: string) {
    const tenantId = req.user.tenantId;
    return await this.service.getStockOverview(tenantId, shopId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.VIEW)
  @Get('imei/:imei')
  async getImeiDetails(@Req() req: any, @Param('imei') imei: string) {
    const tenantId = req.user.tenantId;
    return await this.service.getImeiDetails(tenantId, imei);
  }
}
