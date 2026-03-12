import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission } from '../../../core/permissions/decorators/require-permission.decorator';
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
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';

@Controller('mobileshop/reports')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('report')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
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
    private readonly prisma: PrismaService,
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

  private async validateShopAccess(user: any, shopId?: string): Promise<string | undefined> {
    if (user.role === UserRole.OWNER) return shopId;

    // For Staff, we MUST have a shop context.
    const staffEntries = await this.prisma.shopStaff.findMany({
      where: { userId: user.id, tenantId: user.tenantId, isActive: true, deletedAt: null },
      select: { shopId: true },
    });
    
    const authorizedShopIds = staffEntries.map(s => s.shopId);
    
    if (shopId) {
      if (!authorizedShopIds.includes(shopId)) {
        throw new ForbiddenException('You are not authorized to view reports for this shop');
      }
      return shopId;
    } else {
      // Auto-pick the first shop if they have any.
      if (authorizedShopIds.length > 0) {
        return authorizedShopIds[0];
      }
      throw new ForbiddenException('Staff members must be assigned to at least one shop to view reports');
    }
  }

  @Get('dashboard')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.VIEW)
  async getDashboard(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.reportsService.getOwnerDashboard(user.tenantId, resolvedShopId);
  }

  // --- SALES ---

  @Get('sales/summary')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.SALES_VIEW)
  async getSalesSummary(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.reportsService.getSalesSummary(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      resolvedShopId,
    );
  }

  @Get('sales')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.SALES_VIEW)
  async getPaginatedSales(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('partyId') partyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.reportsService.getPaginatedSales(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      resolvedShopId,
      partyId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // --- PURCHASES ---

  @Get('purchases/summary')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.VIEW)
  async getPurchaseSummary(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.reportsService.getPurchaseSummary(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      resolvedShopId,
    );
  }

  @Get('purchases')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.VIEW)
  async getPaginatedPurchases(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('partyId') partyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.reportsService.getPaginatedPurchases(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      resolvedShopId,
      partyId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // --- INVENTORY ---

  @Get('inventory/summary')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.INVENTORY_VIEW)
  async getInventorySummary(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.reportsService.getInventorySummary(user.tenantId, resolvedShopId);
  }

  @Get('inventory')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.INVENTORY_VIEW)
  async getInventoryReport(
    @CurrentUser() user: any, 
    @Query('shopId') shopId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.reportsService.getPaginatedInventory(
      user.tenantId, 
      resolvedShopId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // --- PROFIT ---

  @Get('profit/summary')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.PROFIT_VIEW)
  async getProfitSummary(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('partyId') partyId?: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.reportsService.getProfitSummary(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      resolvedShopId,
      partyId,
    );
  }

  @Get('profit')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.PROFIT_VIEW)
  async getProfitSummaryAlias(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('partyId') partyId?: string,
  ) {
    return this.getProfitSummary(user, startDate, endDate, shopId, partyId);
  }

  @Get('top-products')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.SALES_VIEW)
  async getTopSellingProducts(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.reportsService.getTopSellingProducts(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      resolvedShopId,
    );
  }

  @Get('repairs')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.VIEW)
  async getRepairReport(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.reportsService.getRepairReport(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      resolvedShopId,
    );
  }

  @Get('repair-metrics')
  async getRepairMetrics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.reportsService.getRepairMetrics(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      resolvedShopId,
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

    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.gstReports.getGSTR1B2B(user.tenantId, from, to, resolvedShopId);
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

    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.gstReports.getGSTR1B2C(user.tenantId, from, to, resolvedShopId);
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

    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.gstReports.getGSTR2(user.tenantId, from, to, resolvedShopId);
  }

  @Get('gstr-1/export')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.EXPORT)
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

    const resolvedShopId = await this.validateShopAccess(user, shopId);
    const csv = await this.gstReports.exportGSTR1AsCSV(
      user.tenantId,
      from,
      to,
      resolvedShopId,
    );
    return { csv };
  }

  @Get('gstr-2/export')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.EXPORT)
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

    const resolvedShopId = await this.validateShopAccess(user, shopId);
    const csv = await this.gstReports.exportGSTR2AsCSV(
      user.tenantId,
      from,
      to,
      resolvedShopId,
    );
    return { csv };
  }

  // ===== PAYMENT REPORTS =====

  @Get('payables-aging')
  async getPayablesAging(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.purchasePayment.getPayablesAging(user.tenantId, resolvedShopId);
  }

  @Get('receivables-aging')
  async getReceivablesAging(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.receivablesAging.getAgingReport(user.tenantId, resolvedShopId);
  }

  @Get('receivables-aging/export')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.EXPORT)
  async exportReceivablesCSV(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    const csv = await this.receivablesAging.exportAsCSV(
      user.tenantId,
      resolvedShopId,
    );
    return { csv };
  }

  @Get('receivables-aging/top-delinquent')
  async getTopDelinquentCustomers(
    @CurrentUser() user: any,
    @Query('shopId') shopId?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.receivablesAging.getTopDelinquentCustomers(
      user.tenantId,
      resolvedShopId,
      limitNum,
    );
  }

  // ===== LOYALTY REPORTS =====

  @Get('loyalty/liability')
  async getLoyaltyLiability(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    await this.validateShopAccess(user, shopId);
    return this.reportsService.getLoyaltyLiability(user.tenantId);
  }

  // ===== WARRANTY TRACKING =====

  @Get('warranties/expiring')
  async getExpiringWarranties(
    @CurrentUser() user: any,
    @Query('shopId') shopId?: string,
    @Query('days') days?: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    const daysAhead = days ? parseInt(days, 10) : 7;
    return this.warranty.getExpiringWarranties(
      user.tenantId,
      resolvedShopId,
      daysAhead,
    );
  }

  @Get('warranties/active')
  async getActiveWarranties(@CurrentUser() user: any, @Query('shopId') shopId?: string) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    return this.warranty.getActiveWarranties(user.tenantId, resolvedShopId);
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
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    if (!resolvedShopId) {
      return { error: 'shopId is required for daily sales report' };
    }

    const from = this.parseDate(startDate, fromDate);
    const to = this.parseDate(endDate, toDate);

    return this.dailySales.getDailySalesReport(
      user.tenantId,
      resolvedShopId,
      from,
      to,
    );
  }

  @Get('daily-sales/today')
  async getTodaySales(@CurrentUser() user: any, @Query('shopId') shopId: string) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    if (!resolvedShopId) {
      return { error: 'shopId is required' };
    }
    return this.dailySales.getTodaySales(user.tenantId, resolvedShopId);
  }

  @Get('daily-sales/comparison')
  async getSalesComparison(@CurrentUser() user: any, @Query('shopId') shopId: string) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    if (!resolvedShopId) {
      return { error: 'shopId is required' };
    }
    return this.dailySales.getSalesComparison(user.tenantId, resolvedShopId);
  }

  @Get('daily-sales/export')
  @RequirePermission(PERMISSIONS.CORE.REPORTS.EXPORT)
  async exportDailySalesCSV(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const resolvedShopId = await this.validateShopAccess(user, shopId);
    if (!resolvedShopId) {
      return { error: 'shopId is required' };
    }

    const from = this.parseDate(startDate, fromDate);
    const to = this.parseDate(endDate, toDate);

    const csv = await this.dailySales.exportDailySalesCSV(
      user.tenantId,
      resolvedShopId,
      from,
      to,
    );
    return { csv };
  }
}
