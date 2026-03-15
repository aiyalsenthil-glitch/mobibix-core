import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { TenantRequiredGuard } from '../../../../core/auth/guards/tenant.guard';
import { GranularPermissionGuard } from '../../../../core/permissions/guards/granular-permission.guard';
import { ModuleScope } from '../../../../core/auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../../../../core/permissions/decorators/require-permission.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { PERMISSIONS } from '../../../../security/permission-registry';
import { CashService } from './cash.service';
import { DailyCloseDto, ShiftOpenDto, ShiftCloseDto } from './dto/cash-management.dto';

@Controller('cash')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('daily_closing')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.STAFF)
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Post('daily-close')
  @RequirePermission(PERMISSIONS.CORE.DAILY_CLOSING.MANAGE)
  dailyClose(@CurrentUser() user: any, @Body() dto: DailyCloseDto) {
    return this.cashService.dailyClose(user.tenantId, user.userId, dto);
  }

  @Get('daily-history')
  @RequirePermission(PERMISSIONS.CORE.DAILY_CLOSING.VIEW)
  getDailyHistory(@CurrentUser() user: any, @Query('shopId') shopId: string) {
    return this.cashService.getDailyHistory(user.tenantId, shopId);
  }

  @Post('shift/open')
  @RequirePermission(PERMISSIONS.CORE.DAILY_CLOSING.MANAGE)
  openShift(@CurrentUser() user: any, @Body() dto: ShiftOpenDto) {
    return this.cashService.openShift(user.tenantId, user.userId, dto);
  }

  @Post('shift/close')
  @RequirePermission(PERMISSIONS.CORE.DAILY_CLOSING.MANAGE)
  closeShift(@CurrentUser() user: any, @Body() dto: ShiftCloseDto) {
    return this.cashService.closeShift(user.tenantId, user.userId, dto);
  }

  @Get('shift/current')
  @RequirePermission(PERMISSIONS.CORE.DAILY_CLOSING.VIEW)
  getCurrentShift(@CurrentUser() user: any, @Query('shopId') shopId: string) {
    return this.cashService.getCurrentShift(user.tenantId, shopId);
  }
}
