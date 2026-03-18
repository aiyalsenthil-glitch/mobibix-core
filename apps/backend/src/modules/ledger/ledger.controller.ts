import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
  Param,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantStatusGuard } from '../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { LedgerService } from './ledger.service';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import {
  CreateLedgerCustomerDto,
  CreateLedgerAccountDto,
  CollectPaymentDto,
} from './dto';

@Controller('ledger')
@ModuleScope(ModuleType.DIGITAL_LEDGER)
@ModulePermission('ledger')
@UseGuards(
  JwtAuthGuard,
  TenantRequiredGuard,
  RolesGuard,
  GranularPermissionGuard,
  TenantStatusGuard,
)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CUSTOMER.CREATE)
  @Post('customers')
  createCustomer(
    @Req() req: any,
    @Body(ValidationPipe) body: CreateLedgerCustomerDto,
  ) {
    return this.ledgerService.createCustomer(req.user.tenantId, body);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LEDGER.MANAGE)
  @Post('accounts')
  createAccount(
    @Req() req: any,
    @Body(ValidationPipe) body: CreateLedgerAccountDto,
  ) {
    return this.ledgerService.createAccount(req.user.tenantId, body);
  }
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CUSTOMER.VIEW)
  @Get('dashboard/stats')
  getDashboardStats(@Req() req: any) {
    return this.ledgerService.getDashboardStats(req.user.tenantId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CUSTOMER.VIEW)
  @Get('customers')
  listCustomers(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ledgerService.listCustomers(
      req.user.tenantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LEDGER.MANAGE)
  @Get('accounts')
  listAccounts(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ledgerService.listAccounts(
      req.user.tenantId,
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CUSTOMER.VIEW)
  @Get('customers/search')
  searchCustomers(@Req() req: any, @Query('q') q: string) {
    return this.ledgerService.searchCustomers(req.user.tenantId, q);
  }
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LEDGER.COLLECT)
  @Get('accounts/:ledgerId/collect')
  getCollectScreen(@Req() req: any, @Param('ledgerId') ledgerId: string) {
    return this.ledgerService.getCollectScreen(req.user.tenantId, ledgerId);
  }
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LEDGER.COLLECT)
  @Post('collections/collect')
  collectAmount(
    @Req() req: any,
    @Body(ValidationPipe) body: CollectPaymentDto,
  ) {
    return this.ledgerService.collectAmount(req.user.tenantId, {
      ...body,
      collectedBy: req.user.id,
    });
  }
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CUSTOMER.VIEW)
  @Get('customers/:customerId/profile')
  getCustomerProfile(@Req() req: any, @Param('customerId') customerId: string) {
    return this.ledgerService.getCustomerProfile(req.user.tenantId, customerId);
  }
}
