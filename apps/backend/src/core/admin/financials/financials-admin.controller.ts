import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin.decorator';
import { AdminRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../auth/decorators/module-scope.decorator';
import { RequirePermission, ModulePermission } from '../../permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { GranularPermissionGuard } from '../../permissions/guards/granular-permission.guard';
import { FinancialsAdminService } from './financials-admin.service';

@Controller('admin/financials')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, AdminRolesGuard, GranularPermissionGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_ADMIN)
export class FinancialsAdminController {
  constructor(private readonly svc: FinancialsAdminService) {}

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('summary')
  getMrrSummary() {
    return this.svc.getMrrSummary();
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('mrr-waterfall')
  getMrrWaterfall() {
    return this.svc.getMrrWaterfall();
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('failed-payments')
  getFailedPayments(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.svc.getFailedPayments(parseInt(page), parseInt(limit));
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('invoice-aging')
  getInvoiceAging() {
    return this.svc.getInvoiceAging();
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('revenue-by-plan')
  getRevenueByPlan() {
    return this.svc.getRevenueByPlan();
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('payment-volume')
  getPaymentVolume() {
    return this.svc.getPaymentVolume();
  }
}
