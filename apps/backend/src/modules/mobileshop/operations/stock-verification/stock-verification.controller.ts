import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { StockVerificationService } from './stock-verification.service';
import {
  CreateVerificationDto,
  AddItemsDto,
  ConfirmVerificationDto,
} from './dto/stock-verification.dto';

import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../../core/auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../../../../core/permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../../../../core/permissions/guards/granular-permission.guard';
import { TenantRequiredGuard } from '../../../../core/auth/guards/tenant.guard';
import { PERMISSIONS } from '../../../../security/permission-registry';

@Controller('operations/stock-verification')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('stock_verification')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
export class StockVerificationController {
  constructor(private readonly svc: StockVerificationService) {}

  /** GET /operations/stock-verification?shopId=&status=&startDate=&endDate= */
  @Get()
  @RequirePermission(PERMISSIONS.CORE.STOCK_VERIFICATION.VIEW)
  list(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.svc.getSessions(user.tenantId, shopId, { status, startDate, endDate });
  }

  /** GET /operations/stock-verification/:id */
  @Get(':id')
  @RequirePermission(PERMISSIONS.CORE.STOCK_VERIFICATION.VIEW)
  detail(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.getSession(user.tenantId, id);
  }

  /** POST /operations/stock-verification */
  @Post()
  @RequirePermission(PERMISSIONS.CORE.STOCK_VERIFICATION.MANAGE)
  create(@CurrentUser() user: any, @Body() dto: CreateVerificationDto) {
    return this.svc.createSession(user.tenantId, user.userId, dto);
  }

  /** POST /operations/stock-verification/:id/items */
  @Post(':id/items')
  @RequirePermission(PERMISSIONS.CORE.STOCK_VERIFICATION.MANAGE)
  addItems(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddItemsDto,
  ) {
    return this.svc.addItems(user.tenantId, id, dto);
  }

  /** POST /operations/stock-verification/:id/confirm */
  @Post(':id/confirm')
  @RequirePermission(PERMISSIONS.CORE.STOCK_VERIFICATION.MANAGE)
  confirm(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ConfirmVerificationDto,
  ) {
    return this.svc.confirmSession(user.tenantId, user.userId, id, dto);
  }

  /** POST /operations/stock-verification/:id/cancel */
  @Post(':id/cancel')
  @RequirePermission(PERMISSIONS.CORE.STOCK_VERIFICATION.MANAGE)
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.cancelSession(user.tenantId, user.userId, id);
  }
}
