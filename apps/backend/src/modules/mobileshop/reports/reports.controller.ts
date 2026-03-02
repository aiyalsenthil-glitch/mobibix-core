import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { MobileShopReportsService } from './reports.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { GSTReportsService } from '../services/gst-reports.service';
import { InvoicePaymentService } from '../services/invoice-payment.service';
import { PurchasePaymentService } from '../services/purchase-payment.service';
import { ReceivablesAgingService } from '../services/receivables-aging.service';
import { WarrantyService } from '../services/warranty.service';
import { DailySalesReportService } from '../services/daily-sales-report.service';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';

@Controller('mobileshop/reports')
@ModuleScope(ModuleType.MOBILE_SHOP)
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class MobileShopReportsController extends TenantScopedController {
  constructor(
    private readonly reportsService: MobileShopReportsService,
    private readonly gstReports: GSTReportsService,
    private readonly invoicePayment: InvoicePaymentService,
    private readonly purchasePayment: PurchasePaymentService,
    private readonly receivablesAging: ReceivablesAgingService,
    private readonly warranty: WarrantyService,
    private readonly dailySales: DailySalesReportService,
  ) {
    super();
  }

  /**
   * Helper to parse date from multiple possible query parameters
   */
  private parseDate(
    primary?: string,
    secondary?: string,
    defaultDate?: Date,
  ): Date {
    if (primary) return new Date(primary);
    if (secondary) return new Date(secondary);
    return defaultDate || new Date();
  }

  private validateShopAccess(user: any, shopId?: string) {
    if (user.role === UserRole.OWNER) return;

    if (shopId) {
      if (!user.shopIds || !user.shopIds.includes(shopId)) {
        throw new ForbiddenException('You are not authorized to view reports for this shop');
      }
    } else {
      throw new ForbiddenException('Staff members must specify a shopId to view reports');
    }
  }

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    this.validateShopAccess(user, shopId);
    return this.reportsService.getOwnerDashboard(user.tenantId, shopId);
  }

  // --- SALES ---

  @Get('sales/summary')
  async getSalesSummary(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    this.validateShopAccess(user, shopId);
    return this.reportsService.getSalesSummary(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
    );
  }

  @Get('sales')
  async getPaginatedSales(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('partyId') partyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.validateShopAccess(user, shopId);
    return this.reportsService.getPaginatedSales(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
      partyId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // --- PURCHASES ---

  @Get('purchases/summary')
  async getPurchaseSummary(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    this.validateShopAccess(user, shopId);
    return this.reportsService.getPurchaseSummary(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
    );
  }

  @Get('purchases')
  async getPaginatedPurchases(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('partyId') partyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.validateShopAccess(user, shopId);
    return this.reportsService.getPaginatedPurchases(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
      partyId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // --- INVENTORY ---

  @Get('inventory/summary')
  async getInventorySummary(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    this.validateShopAccess(user, shopId);
    return this.reportsService.getInventorySummary(user.tenantId, shopId);
  }

  @Get('inventory')
  async getInventoryReport(
    @CurrentUser() user: any, 
    @Query('shopId') shopId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.validateShopAccess(user, shopId);
    return this.reportsService.getPaginatedInventory(
      user.tenantId, 
      shopId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // --- PROFIT ---

  @Get('profit/summary')
  async getProfitSummary(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('partyId') partyId?: string,
  ) {
    this.validateShopAccess(user, shopId);
    return this.reportsService.getProfitSummary(
      user.tenantId,
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
    const tenantId = this.getTenantId(req);
    return this.reportsService.getTopSellingProducts(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
    );
  }

  @Get('repairs')
  async getRepairReport(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.reportsService.getRepairReport(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
    );
  }

  @Get('repair-metrics')
  async getRepairMetrics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.reportsService.getRepairMetrics(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
    );
  }

  // ===== GST REPORTS =====

  @Get('gstr-1/b2b')
  async getGSTR1B2B(
    @CurrentUser() user: any,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('shopId') shopId?: string,
  ) {
    const from = this.parseDate(startDate, fromDate);
    const to = this.parseDate(endDate, toDate);

    return this.gstReports.getGSTR1B2B(user.tenantId, from, to, shopId);
  }

  @Get('gstr-1/b2c')
  async getGSTR1B2C(
    @CurrentUser() user: any,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('shopId') shopId?: string,
  ) {
    const from = this.parseDate(startDate, fromDate);
    const to = this.parseDate(endDate, toDate);

    return this.gstReports.getGSTR1B2C(user.tenantId, from, to, shopId);
  }

  @Get('gstr-2')
  async getGSTR2(
    @CurrentUser() user: any,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('shopId') shopId?: string,
  ) {
    const from = this.parseDate(startDate, fromDate);
    const to = this.parseDate(endDate, toDate);

    return this.gstReports.getGSTR2(user.tenantId, from, to, shopId);
  }

  @Get('gstr-1/export')
  async exportGSTR1CSV(
    @CurrentUser() user: any,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('shopId') shopId?: string,
  ) {
    const from = this.parseDate(startDate, fromDate);
    const to = this.parseDate(endDate, toDate);

    const csv = await this.gstReports.exportGSTR1AsCSV(
      user.tenantId,
      from,
      to,
      shopId,
    );
    return { csv };
  }

  @Get('gstr-2/export')
  async exportGSTR2CSV(
    @CurrentUser() user: any,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('shopId') shopId?: string,
  ) {
    const from = this.parseDate(startDate, fromDate);
    const to = this.parseDate(endDate, toDate);

    const csv = await this.gstReports.exportGSTR2AsCSV(
      user.tenantId,
      from,
      to,
      shopId,
    );
    return { csv };
  }

  // ===== PAYMENT REPORTS =====

  @Get('payables-aging')
  async getPayablesAging(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    this.validateShopAccess(user, shopId);
    return this.purchasePayment.getPayablesAging(user.tenantId, shopId);
  }

  @Get('receivables-aging')
  async getReceivablesAging(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    this.validateShopAccess(user, shopId);
    return this.receivablesAging.getAgingReport(user.tenantId, shopId);
  }

  @Get('receivables-aging/export')
  async exportReceivablesCSV(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    this.validateShopAccess(user, shopId);
    const csv = await this.receivablesAging.exportAsCSV(
      user.tenantId,
      shopId,
    );
    return { csv };
  }

  @Get('receivables-aging/top-delinquent')
  async getTopDelinquentCustomers(
    @CurrentUser() user: any,
    @Query('shopId') shopId?: string,
    @Query('limit') limit?: string,
  ) {
    this.validateShopAccess(user, shopId);
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.receivablesAging.getTopDelinquentCustomers(
      user.tenantId,
      shopId,
      limitNum,
    );
  }

  // ===== LOYALTY REPORTS =====

  @Get('loyalty/liability')
  async getLoyaltyLiability(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    this.validateShopAccess(user, shopId);
    return this.reportsService.getLoyaltyLiability(user.tenantId);
  }

  // ===== WARRANTY TRACKING =====

  @Get('warranties/expiring')
  async getExpiringWarranties(
    @CurrentUser() user: any,
    @Query('shopId') shopId?: string,
    @Query('days') days?: string,
  ) {
    this.validateShopAccess(user, shopId);
    const daysAhead = days ? parseInt(days, 10) : 7;
    return this.warranty.getExpiringWarranties(
      user.tenantId,
      shopId,
      daysAhead,
    );
  }

  @Get('warranties/active')
  async getActiveWarranties(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    this.validateShopAccess(user, shopId);
    return this.warranty.getActiveWarranties(user.tenantId, shopId);
  }

  // ===== DAILY SALES REPORTS =====

  @Get('daily-sales')
  async getDailySalesReport(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!shopId) {
      return { error: 'shopId is required for daily sales report' };
    }

    const from = this.parseDate(startDate, fromDate);
    const to = this.parseDate(endDate, toDate);

    return this.dailySales.getDailySalesReport(
      user.tenantId,
      shopId,
      from,
      to,
    );
  }

  @Get('daily-sales/today')
  async getTodaySales(@CurrentUser() user: any, @Query('shopId') shopId: string) {
    if (!shopId) {
      return { error: 'shopId is required' };
    }
    return this.dailySales.getTodaySales(user.tenantId, shopId);
  }

  @Get('daily-sales/comparison')
  async getSalesComparison(@CurrentUser() user: any, @Query('shopId') shopId: string) {
    if (!shopId) {
      return { error: 'shopId is required' };
    }
    return this.dailySales.getSalesComparison(user.tenantId, shopId);
  }

  @Get('daily-sales/export')
  async exportDailySalesCSV(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!shopId) {
      return { error: 'shopId is required' };
    }

    const from = this.parseDate(startDate, fromDate);
    const to = this.parseDate(endDate, toDate);

    const csv = await this.dailySales.exportDailySalesCSV(
      user.tenantId,
      shopId,
      from,
      to,
    );
    return { csv };
  }
}
