import { Controller, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RepairService } from './repair.service';
import { RepairStockOutDto } from './dto/repair-stock-out.dto';
import { RepairBillDto } from './dto/repair-bill.dto';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';

@Controller('mobileshop/repairs')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('repair')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class RepairController extends TenantScopedController {
  constructor(private repairService: RepairService) {
    super();
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.REPAIR.STOCK_OUT)
  @Post('out')
  async stockOut(@Req() req: any, @Body() dto: RepairStockOutDto) {
    const tenantId = this.getTenantId(req);
    return this.repairService.stockOutForRepair(tenantId, dto);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.REPAIR.BILL)
  @Post(':jobCardId/bill')
  async generateBill(
    @Req() req: any,
    @Param('jobCardId') jobCardId: string,
    @Body() dto: RepairBillDto,
  ) {
    const tenantId = this.getTenantId(req);
    const dtoWithJobId = { ...dto, jobCardId };
    return this.repairService.generateRepairBill(tenantId, dtoWithJobId);
  }
}
