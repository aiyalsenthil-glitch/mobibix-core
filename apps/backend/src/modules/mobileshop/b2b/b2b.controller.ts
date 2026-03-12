import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { B2BService } from './b2b.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';
import { UserRole, ModuleType } from '@prisma/client';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';

@Controller('mobileshop/b2b')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('b2b')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class B2BController extends TenantScopedController {
  constructor(private readonly b2bService: B2BService) {
    super();
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.B2B.ONBOARD)
  @Post('onboard-distributor')
  async onboard(@Body() body: any) {
    return this.b2bService.onboardDistributor(body);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.B2B.VIEW_CATALOG)
  @Get('catalog')
  async getCatalog(@CurrentUser() user: any) {
    return this.b2bService.getAvailableWholesaleItems(user.tenantId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.B2B.LINK_DISTRIBUTOR)
  @Post('link/:distributorId')
  async link(
    @CurrentUser() user: any,
    @Param('distributorId') distributorId: string,
  ) {
    return this.b2bService.requestLink(user.tenantId, distributorId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.B2B.PLACE_ORDER)
  @Post('order')
  async placeOrder(@CurrentUser() user: any, @Body() body: any) {
    return this.b2bService.placeB2BOrder(user.tenantId, body);
  }
}
