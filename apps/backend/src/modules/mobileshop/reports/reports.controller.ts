import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { MobileShopReportsService } from './reports.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';

@Controller('api/mobileshop/reports')
@UseGuards(JwtAuthGuard)
export class MobileShopReportsController {
  constructor(private readonly reportsService: MobileShopReportsService) {}

  @Get('dashboard')
  async getDashboard(@Request() req, @Query('shopId') shopId?: string) {
    const tenantId = req.user.tenantId;
    return this.reportsService.getOwnerDashboard(tenantId, shopId);
  }

  @Get('sales')
  async getSalesReport(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('partyId') partyId?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.reportsService.getSalesReport(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
      partyId,
    );
  }

  @Get('purchases')
  async getPurchaseReport(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('partyId') partyId?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.reportsService.getPurchaseReport(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
      partyId,
    );
  }

  @Get('inventory')
  async getInventoryReport(@Request() req, @Query('shopId') shopId?: string) {
    const tenantId = req.user.tenantId;
    return this.reportsService.getInventoryReport(tenantId, shopId);
  }

  @Get('profit')
  async getProfitSummary(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('partyId') partyId?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.reportsService.getProfitSummary(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
      partyId,
    );
  }

  @Get('top-products')
  async getTopSellingProducts(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.reportsService.getTopSellingProducts(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
    );
  }
}
