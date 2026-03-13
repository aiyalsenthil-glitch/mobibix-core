import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType, PaymentMode } from '@prisma/client';
import { ModuleScope } from '../../../../core/auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../../../../core/permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../../../../core/permissions/guards/granular-permission.guard';
import { TenantRequiredGuard } from '../../../../core/auth/guards/tenant.guard';
import { PERMISSIONS } from '../../../../security/permission-registry';
import { Delete, Param, Put } from '@nestjs/common';

@Controller('operations/expenses')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('expense')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
export class ExpensesController {
  constructor(private readonly svc: ExpensesService) {}

  /** POST /operations/expenses */
  @Post()
  @RequirePermission(PERMISSIONS.CORE.EXPENSE.CREATE)
  create(@CurrentUser() user: any, @Body() dto: CreateExpenseDto) {
    return this.svc.createExpense(user.tenantId, user.userId, dto);
  }

  /** PUT /operations/expenses/:id */
  @Put(':id')
  @RequirePermission(PERMISSIONS.CORE.EXPENSE.MANAGE)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateExpense(user.tenantId, user.shopId, id, dto, user.userId);
  }

  /** DELETE /operations/expenses/:id */
  @Delete(':id')
  @RequirePermission(PERMISSIONS.CORE.EXPENSE.MANAGE)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.deleteExpense(user.tenantId, user.shopId, id, user.userId);
  }


  /** GET /operations/expenses?shopId=&startDate=&endDate=&category= */
  @Get()
  @RequirePermission(PERMISSIONS.CORE.EXPENSE.VIEW)
  list(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.svc.getExpenses(user.tenantId, shopId, {
      startDate,
      endDate,
      category,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  /** GET /operations/expenses/summary?shopId=&startDate=&endDate= */
  @Get('summary')
  @RequirePermission(PERMISSIONS.CORE.EXPENSE.VIEW)
  summary(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.svc.getExpenseSummary(user.tenantId, shopId, startDate, endDate);
  }

  /** GET /operations/expenses/categories?shopId=&startDate=&endDate= */
  @Get('categories')
  @RequirePermission(PERMISSIONS.CORE.EXPENSE.VIEW)
  categories(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.svc.getCategoryBreakdown(user.tenantId, shopId, startDate, endDate);
  }

  /** GET /operations/expenses/categories/list?shopId= */
  @Get('categories/list')
  @RequirePermission(PERMISSIONS.CORE.EXPENSE.VIEW)
  listCategories(@CurrentUser() user: any, @Query('shopId') shopId: string) {
    return this.svc.getCategories(user.tenantId, shopId);
  }

  /** POST /operations/expenses/categories */
  @Post('categories')
  @RequirePermission(PERMISSIONS.CORE.EXPENSE.CREATE)
  createCategory(@CurrentUser() user: any, @Body() body: { name: string; shopId?: string }) {
    return this.svc.createCategory(user.tenantId, body.name, body.shopId);
  }

  /** POST /operations/expenses/categories/seed */
  @Post('categories/seed')
  @RequirePermission(PERMISSIONS.CORE.EXPENSE.CREATE)
  seedCategories(@CurrentUser() user: any) {
    return this.svc.seedDefaultCategories(user.tenantId);
  }
}
