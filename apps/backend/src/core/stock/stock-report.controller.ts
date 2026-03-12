import {
  BadRequestException,
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { StockReportService } from './stock-report.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

type ReqWithUser = { user: { tenantId: string } };

@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('inventory')
@Controller('reports')
export class StockReportController {
  constructor(private readonly service: StockReportService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.VIEW)
  @Get('negative-stock')
  async negativeStock(@Req() req: ReqWithUser) {
    const items = await this.service.getNegativeStockReport(req.user.tenantId);
    return { items };
  }
}
