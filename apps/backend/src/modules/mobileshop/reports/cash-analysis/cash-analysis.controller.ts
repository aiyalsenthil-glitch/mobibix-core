import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../../../core/auth/guards/tenant.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { CashAnalysisService } from './cash-analysis.service';
import { CashLeakageAnalysisDto, CashLeakageResponse } from './dto/cash-analysis.dto';
import { TenantScopedController } from '../../../../core/auth/tenant-scoped.controller';
import { ModuleScope } from '../../../../core/auth/decorators/module-scope.decorator';
import { ModulePermission } from '../../../../core/permissions/decorators/require-permission.decorator';

@Controller('mobileshop/reports')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('report')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
export class CashAnalysisController extends TenantScopedController {
  constructor(private readonly cashAnalysisService: CashAnalysisService) {
    super();
  }

  @Get('cash-leakage-analysis')
  async getLeakageAnalysis(@Request() req: any, @Query() dto: CashLeakageAnalysisDto): Promise<CashLeakageResponse> {
    return this.cashAnalysisService.getLeakageAnalysis(req.user.tenantId, dto);
  }
}
