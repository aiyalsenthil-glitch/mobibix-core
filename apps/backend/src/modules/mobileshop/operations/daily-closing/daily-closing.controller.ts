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
import { DailyClosingService } from './daily-closing.service';
import { CloseDayDto, ReopenDayDto, ApproveCashVarianceDto } from './dto/close-day.dto';

import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../../core/auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../../../../core/permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../../../../core/permissions/guards/granular-permission.guard';
import { TenantRequiredGuard } from '../../../../core/auth/guards/tenant.guard';
import { PERMISSIONS } from '../../../../security/permission-registry';

@Controller('operations/daily-closing')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('daily_closing')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
export class DailyClosingController {
  constructor(private readonly svc: DailyClosingService) {}

  /** GET /operations/daily-closing/summary?shopId=&date= */
  @Get('summary')
  @RequirePermission(PERMISSIONS.CORE.DAILY_CLOSING.VIEW)
  getSummary(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('date') date: string,
  ) {
    return this.svc.getDailySummary(user.tenantId, shopId, date);
  }

  /** GET /operations/daily-closing?shopId=&startDate=&endDate= */
  @Get()
  @RequirePermission(PERMISSIONS.CORE.DAILY_CLOSING.VIEW)
  list(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.svc.getClosings(user.tenantId, shopId, { startDate, endDate });
  }

  /** POST /operations/daily-closing/close */
  @Post('close')
  @RequirePermission(PERMISSIONS.CORE.DAILY_CLOSING.MANAGE)
  close(@CurrentUser() user: any, @Body() dto: CloseDayDto) {
    return this.svc.closeDay(user.tenantId, user.userId, dto);
  }

  /** POST /operations/daily-closing/reopen */
  @Post('reopen')
  @RequirePermission(PERMISSIONS.CORE.DAILY_CLOSING.MANAGE)
  reopen(@CurrentUser() user: any, @Body() dto: ReopenDayDto) {
    return this.svc.reopenDay(user.tenantId, user.userId, dto);
  }

  /** GET /operations/daily-closing/variances?shopId=&status= */
  @Get('variances')
  @RequirePermission(PERMISSIONS.CORE.DAILY_CLOSING.VIEW)
  variances(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.svc.getCashVariances(user.tenantId, shopId, { status, startDate, endDate });
  }

  /** POST /operations/daily-closing/variances/approve */
  @Post('variances/approve')
  @RequirePermission(PERMISSIONS.CORE.DAILY_CLOSING.MANAGE)
  approveVariance(@CurrentUser() user: any, @Body() dto: ApproveCashVarianceDto) {
    return this.svc.approveCashVariance(user.tenantId, user.userId, dto);
  }
}
