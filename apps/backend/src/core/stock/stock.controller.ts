import { Controller, Get, Param, Query, Req, UseGuards, Post, Patch, Delete, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { StockService } from './stock.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType, IMEIStatus } from '@prisma/client';
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

  // --- IMEI Management ---

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.VIEW)
  @Get('imei')
  async listImeis(
    @Req() req: any,
    @Query('status') status?: IMEIStatus,
    @Query('shopId') shopId?: string,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.service.getImeiList(req.user.tenantId, {
      status,
      shopId,
      productId,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.VIEW)
  @Get('imei/:imei')
  async getImeiDetails(@Req() req: any, @Param('imei') imei: string) {
    return await this.service.getImeiDetails(req.user.tenantId, imei);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.UPDATE)
  @Patch('imei/:imei/status')
  async updateImeiStatus(
    @Req() req: any,
    @Param('imei') imei: string,
    @Body() body: { status: IMEIStatus; notes?: string },
  ) {
    return await this.service.updateImeiStatus(req.user.tenantId, imei, body.status, body.notes);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.UPDATE)
  @Post('imei/:imei/transfer')
  async transferImei(
    @Req() req: any,
    @Param('imei') imei: string,
    @Body() body: { targetShopId: string },
  ) {
    return await this.service.transferImei(req.user.tenantId, imei, body.targetShopId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.UPDATE)
  @Post('imei/:imei/reserve')
  async reserveImei(@Req() req: any, @Param('imei') imei: string) {
    return await this.service.reserveImei(req.user.tenantId, imei);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.UPDATE)
  @Delete('imei/:imei/reserve')
  async releaseImeiReserve(@Req() req: any, @Param('imei') imei: string) {
    return await this.service.releaseImeiReserve(req.user.tenantId, imei);
  }
}
