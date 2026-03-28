import {
  Controller, Get, Post, Delete,
  Req, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { GymExpensesService, CreateGymExpenseDto } from './gym-expenses.service';

@Controller('gym/expenses')
@ModuleScope(ModuleType.GYM)
@ModulePermission('payment')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class GymExpensesController {
  constructor(private readonly expensesService: GymExpensesService) {}

  @RequirePermission(PERMISSIONS.GYM.PAYMENT.VIEW)
  @Get()
  list(@Req() req: any, @Query('month') month?: string) {
    return this.expensesService.listExpenses(req.user.tenantId, month);
  }

  @RequirePermission(PERMISSIONS.GYM.PAYMENT.VIEW)
  @Get('summary')
  summary(@Req() req: any, @Query('month') month: string) {
    const m = month ?? new Date().toISOString().slice(0, 7);
    return this.expensesService.getMonthlySummary(req.user.tenantId, m);
  }

  @RequirePermission(PERMISSIONS.GYM.PAYMENT.COLLECT)
  @Roles(UserRole.OWNER)
  @Post()
  create(@Req() req: any, @Body() dto: CreateGymExpenseDto) {
    return this.expensesService.createExpense(req.user.tenantId, dto, req.user.sub);
  }

  @RequirePermission(PERMISSIONS.GYM.PAYMENT.COLLECT)
  @Roles(UserRole.OWNER)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.expensesService.deleteExpense(req.user.tenantId, id);
  }
}
