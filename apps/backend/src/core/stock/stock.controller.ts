import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { StockService } from './stock.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('mobileshop/stock')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get('summary')
  async getSummary(@Req() req: any, @Query('shopId') shopId?: string) {
    const tenantId = req.user.tenantId;
    return await this.service.getStockBalances(tenantId, shopId);
  }

  @Get('overview')
  async getOverview(@Req() req: any, @Query('shopId') shopId?: string) {
    const tenantId = req.user.tenantId;
    return await this.service.getStockOverview(tenantId, shopId);
  }

  @Get('imei/:imei')
  async getImeiDetails(@Req() req: any, @Param('imei') imei: string) {
    const tenantId = req.user.tenantId;
    return await this.service.getImeiDetails(tenantId, imei);
  }
}
