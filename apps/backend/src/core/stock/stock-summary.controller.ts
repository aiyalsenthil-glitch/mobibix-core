import {
  Controller,
  Get,
  Query,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';
import { StockSummaryService } from './stock-summary.service';

@Controller('mobileshop/stock')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class StockSummaryController {
  constructor(private readonly service: StockSummaryService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.VIEW)
  @Get('summary')
  async summary(@Req() req, @Query('shopId') shopId: string) {
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }

    const tenantId = req.user.tenantId;

    return this.service.getSummary(tenantId, shopId);
  }
}
