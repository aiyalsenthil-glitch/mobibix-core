import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { PurchaseService } from './purchase.service';
import { PurchaseStockInDto } from './dto/purchase-stock-in.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('mobileshop/purchase')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('inventory')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class PurchaseController {
  constructor(private readonly service: PurchaseService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.CREATE)
  @Post('stock-in')
  async stockIn(@Req() req: any, @Body() dto: PurchaseStockInDto) {
    // ✅ USE TENANT FROM REQUEST CONTEXT (set by TenantRequiredGuard)
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }
    return this.service.stockIn(tenantId, dto);
  }
}
