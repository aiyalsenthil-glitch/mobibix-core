import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { VoucherEntity } from './entities/voucher.entity';
import { PaymentMode, VoucherStatus, UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';

@Controller('vouchers')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('voucher')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.STAFF)
export class VouchersController extends TenantScopedController {
  constructor(private readonly vouchersService: VouchersService) {
    super();
  }

  /**
   * Create a voucher for money paid out
   * POST /vouchers
   * Body: CreateVoucherDto
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.VOUCHER.CREATE)
  @Post()
  async create(
    @Body() createVoucherDto: CreateVoucherDto,
    @CurrentUser() user: any,
  ): Promise<VoucherEntity> {
    return this.vouchersService.createVoucher(
      user.tenantId,
      createVoucherDto.shopId || user.shopId,
      createVoucherDto,
      user.sub,
    );
  }

  /**
   * Get all vouchers for authenticated shop
   * GET /vouchers?startDate=...&endDate=...&paymentMethod=...&voucherType=...&skip=...&take=...
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.VOUCHER.VIEW)
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('shopId') shopId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentMethod') paymentMethod?: PaymentMode,
    @Query('status') status?: VoucherStatus,
    @Query('voucherType') voucherType?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<{ data: VoucherEntity[]; total: number }> {
    return this.vouchersService.getVouchers(
      user.tenantId,
      shopId || user.shopId,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        paymentMethod,
        status,
        voucherType,
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      },
    );
  }

  /**
   * Get single voucher by ID
   * GET /vouchers/:id
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.VOUCHER.VIEW)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<VoucherEntity> {
    return this.vouchersService.getVoucher(user.tenantId, user.shopId, id);
  }

  /**
   * Cancel a voucher (soft delete)
   * POST /vouchers/:id/cancel
   * Body: { reason: string }
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.VOUCHER.CANCEL)
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ): Promise<VoucherEntity> {
    return this.vouchersService.cancelVoucher(
      user.tenantId,
      user.shopId,
      id,
      reason,
    );
  }

  /**
   * Get voucher summary by date range
   * GET /vouchers/summary?startDate=...&endDate=...
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.VOUCHER.VIEW)
  @Get('summary')
  async getSummary(
    @CurrentUser() user: any,
    @Query('shopId') shopId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const end = endDate ? new Date(endDate) : new Date();

    return this.vouchersService.getVoucherSummary(
      user.tenantId,
      shopId || user.shopId,
      start,
      end,
    );
  }
}
