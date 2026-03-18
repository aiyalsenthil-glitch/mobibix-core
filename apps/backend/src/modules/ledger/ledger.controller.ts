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
  ParseIntPipe,
  DefaultValuePipe,
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
@ModuleScope(ModuleType.MOBILE_SHOP)
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
  // GET /ledger/customers — list with pagination
  // FROZEN RESPONSE: { customers[], total, page, limit }
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CUSTOMER.VIEW)
  @Get('customers')
  listCustomers(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.ledgerService.listCustomers(
      req.user.tenantId,
      page,
      Math.min(limit, 50),
    );
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CUSTOMER.VIEW)
  @Get('customers/search')
  searchCustomers(@Req() req: any, @Query('q') q: string) {
    return this.ledgerService.searchCustomers(req.user.tenantId, q);
  }
  // GET /ledger/accounts — list with pagination + optional filters
  // FROZEN RESPONSE: { accounts[], total, page, limit }
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LEDGER.MANAGE)
  @Get('accounts')
  listAccounts(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.ledgerService.listAccounts(
      req.user.tenantId,
      page,
      Math.min(limit, 50),
      status,
      customerId,
    );
  }

  // GET /ledger/accounts/:id — full detail with collections + payments
  // FROZEN RESPONSE: account + collections[] + recentPayments[]
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LEDGER.MANAGE)
  @Get('accounts/:id')
  getAccountDetail(@Req() req: any, @Param('id') id: string) {
    return this.ledgerService.getAccountDetail(req.user.tenantId, id);
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
