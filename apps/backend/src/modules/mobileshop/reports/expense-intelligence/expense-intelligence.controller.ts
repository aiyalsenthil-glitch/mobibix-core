import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../../../core/auth/guards/tenant.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../../../core/permissions/guards/granular-permission.guard';
import { ExpenseIntelligenceService } from './expense-intelligence.service';
import { ExpenseIntelligenceQueryDto } from './dto/expense-intelligence-query.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { PERMISSIONS } from '../../../../security/permission-registry';
import { RequirePermission } from '../../../../core/permissions/decorators/require-permission.decorator';

@ApiTags('Expense Intelligence')
@Controller('reports/expense-intelligence')
@ModuleScope(ModuleType.MOBILE_SHOP)
@RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class ExpenseIntelligenceController {
  constructor(private readonly service: ExpenseIntelligenceService) {}

  @Get()
  @ApiOperation({ summary: 'Get Expense Intelligence Dashboard Data' })
  @ApiResponse({ status: 200, description: 'Combined intelligence report' })
  async getIntelligence(
    @Request() req: any,
    @Query() query: ExpenseIntelligenceQueryDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.service.getIntelligence(tenantId, query);
  }

  @Get('overview')
  async getOverview(@Request() req: any, @Query() query: ExpenseIntelligenceQueryDto) {
    const res = await this.service.getIntelligence(req.user.tenantId, query);
    return res.overview;
  }

  @Get('category-breakdown')
  async getCategoryBreakdown(@Request() req: any, @Query() query: ExpenseIntelligenceQueryDto) {
    const res = await this.service.getIntelligence(req.user.tenantId, query);
    return res.categoryBreakdown;
  }

  @Get('monthly-trend')
  async getMonthlyTrend(@Request() req: any, @Query() query: ExpenseIntelligenceQueryDto) {
    const res = await this.service.getIntelligence(req.user.tenantId, query);
    return res.monthlyTrend;
  }

  @Get('payment-methods')
  async getPaymentMethods(@Request() req: any, @Query() query: ExpenseIntelligenceQueryDto) {
    const res = await this.service.getIntelligence(req.user.tenantId, query);
    return res.paymentMethods;
  }
}
