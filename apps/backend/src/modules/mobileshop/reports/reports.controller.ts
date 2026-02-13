import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { MobileShopReportsService } from './reports.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GSTReportsService } from '../services/gst-reports.service';
import { InvoicePaymentService } from '../services/invoice-payment.service';
import { PurchasePaymentService } from '../services/purchase-payment.service';
import { ReceivablesAgingService } from '../services/receivables-aging.service';
import { WarrantyService } from '../services/warranty.service';
import { DailySalesReportService } from '../services/daily-sales-report.service';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';

@Controller('api/mobileshop/reports')
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

  @Get('dashboard')
  async getDashboard(@Request() req, @Query('shopId') shopId?: string) {
    const tenantId = this.getTenantId(req);
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
    const tenantId = this.getTenantId(req);
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
    const tenantId = this.getTenantId(req);
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
    const tenantId = this.getTenantId(req);
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
    const tenantId = this.getTenantId(req);
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
    const tenantId = this.getTenantId(req);
    return this.reportsService.getTopSellingProducts(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      shopId,
    );
  }

  // ===== GST REPORTS =====

  @Get('gstr-1/b2b')
  async getGSTR1B2B(
    @Request() req,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.gstReports.getGSTR1B2B(
      this.getTenantId(req),
      new Date(fromDate),
      new Date(toDate),
      shopId,
    );
  }

  @Get('gstr-1/b2c')
  async getGSTR1B2C(
    @Request() req,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.gstReports.getGSTR1B2C(
      this.getTenantId(req),
      new Date(fromDate),
      new Date(toDate),
      shopId,
    );
  }

  @Get('gstr-2')
  async getGSTR2(
    @Request() req,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.gstReports.getGSTR2(
      this.getTenantId(req),
      new Date(fromDate),
      new Date(toDate),
      shopId,
    );
  }

  @Get('gstr-1/export')
  async exportGSTR1CSV(
    @Request() req,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('shopId') shopId?: string,
  ) {
    const csv = await this.gstReports.exportGSTR1AsCSV(
      this.getTenantId(req),
      new Date(fromDate),
      new Date(toDate),
      shopId,
    );
    return { csv };
  }

  @Get('gstr-2/export')
  async exportGSTR2CSV(
    @Request() req,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('shopId') shopId?: string,
  ) {
    const csv = await this.gstReports.exportGSTR2AsCSV(
      this.getTenantId(req),
      new Date(fromDate),
      new Date(toDate),
      shopId,
    );
    return { csv };
  }

  // ===== PAYMENT REPORTS =====

  @Get('payables-aging')
  async getPayablesAging(@Request() req, @Query('shopId') shopId?: string) {
    return this.purchasePayment.getPayablesAging(this.getTenantId(req), shopId);
  }

  @Get('receivables-aging')
  async getReceivablesAging(@Request() req, @Query('shopId') shopId?: string) {
    return this.receivablesAging.getAgingReport(this.getTenantId(req), shopId);
  }

  @Get('receivables-aging/export')
  async exportReceivablesCSV(@Request() req, @Query('shopId') shopId?: string) {
    const csv = await this.receivablesAging.exportAsCSV(
      req.user.tenantId,
      shopId,
    );
    return { csv };
  }

  @Get('receivables-aging/top-delinquent')
  async getTopDelinquentCustomers(
    @Request() req,
    @Query('shopId') shopId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.receivablesAging.getTopDelinquentCustomers(
      req.user.tenantId,
      shopId,
      limitNum,
    );
  }

  // ===== WARRANTY TRACKING =====

  @Get('warranties/expiring')
  async getExpiringWarranties(
    @Request() req,
    @Query('shopId') shopId?: string,
    @Query('days') days?: string,
  ) {
    const daysAhead = days ? parseInt(days, 10) : 7;
    return this.warranty.getExpiringWarranties(
      req.user.tenantId,
      shopId,
      daysAhead,
    );
  }

  @Get('warranties/active')
  async getActiveWarranties(@Request() req, @Query('shopId') shopId?: string) {
    return this.warranty.getActiveWarranties(req.user.tenantId, shopId);
  }

  // ===== DAILY SALES REPORTS =====

  @Get('daily-sales')
  async getDailySalesReport(
    @Request() req,
    @Query('shopId') shopId: string,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
  ) {
    if (!shopId) {
      return { error: 'shopId is required for daily sales report' };
    }
    return this.dailySales.getDailySalesReport(
      req.user.tenantId,
      shopId,
      new Date(fromDate),
      new Date(toDate),
    );
  }

  @Get('daily-sales/today')
  async getTodaySales(@Request() req, @Query('shopId') shopId: string) {
    if (!shopId) {
      return { error: 'shopId is required' };
    }
    return this.dailySales.getTodaySales(req.user.tenantId, shopId);
  }

  @Get('daily-sales/comparison')
  async getSalesComparison(@Request() req, @Query('shopId') shopId: string) {
    if (!shopId) {
      return { error: 'shopId is required' };
    }
    return this.dailySales.getSalesComparison(req.user.tenantId, shopId);
  }

  @Get('daily-sales/export')
  async exportDailySalesCSV(
    @Request() req,
    @Query('shopId') shopId: string,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
  ) {
    if (!shopId) {
      return { error: 'shopId is required' };
    }
    const csv = await this.dailySales.exportDailySalesCSV(
      req.user.tenantId,
      shopId,
      new Date(fromDate),
      new Date(toDate),
    );
    return { csv };
  }
}
