import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { GSTR1Service } from './gstr1.service';
import { GSTR2Service } from './gstr2.service';
import { AgingReportsService } from './aging-reports.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('reports')
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class ReportsHardeningController {
  constructor(
    private readonly gstr1Service: GSTR1Service,
    private readonly gstr2Service: GSTR2Service,
    private readonly agingReportsService: AgingReportsService,
  ) {}

  /**
   * GET /gstr1 - Generate GSTR-1 sales register
   */
  @RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
  @Get('gstr1')
  async getGSTR1(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.gstr1Service.generateSalesRegister(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * GET /gstr1/hsn-summary - GSTR-1 HSN-wise summary
   */
  @RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
  @Get('gstr1/hsn-summary')
  async getGSTR1HSNSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.gstr1Service.generateHSNSummary(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * GET /gstr2 - Generate GSTR-2 purchase register with ITC tracking
   */
  @RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
  @Get('gstr2')
  async getGSTR2(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.gstr2Service.generatePurchaseRegister(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * GET /gstr2/hsn-summary - GSTR-2 HSN-wise summary
   */
  @RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
  @Get('gstr2/hsn-summary')
  async getGSTR2HSNSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.gstr2Service.generateHSNSummary(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * GET /gstr2/itc-summary - ITC eligible summary
   */
  @RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
  @Get('gstr2/itc-summary')
  async getITCSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.gstr2Service.getITCEligibleSummary(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * GET /receivables-aging - Receivables aging summary
   */
  @RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
  @Get('receivables-aging')
  async getReceivablesAging(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.agingReportsService.getReceivablesAging(tenantId);
  }

  /**
   * GET /receivables-aging/detailed - Receivables aging with invoice list
   */
  @RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
  @Get('receivables-aging/detailed')
  async getDetailedReceivablesAging(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.agingReportsService.getDetailedReceivablesAging(tenantId);
  }

  /**
   * GET /payables-aging - Payables aging summary
   */
  @RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
  @Get('payables-aging')
  async getPayablesAging(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.agingReportsService.getPayablesAging(tenantId);
  }

  /**
   * GET /payables-aging/detailed - Payables aging with purchase list
   */
  @RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
  @Get('payables-aging/detailed')
  async getDetailedPayablesAging(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.agingReportsService.getDetailedPayablesAging(tenantId);
  }
}
