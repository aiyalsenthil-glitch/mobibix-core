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
import { ReceiptsService } from '../../../core/receipts/receipts.service';
import { CreateReceiptDto } from '../../../core/receipts/dto/create-receipt.dto';
import { ReceiptEntity } from '../../../core/receipts/entities/receipt.entity';
import {
  PaymentMode,
  ReceiptStatus,
  UserRole,
  ModuleType,
} from '@prisma/client';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';

@Controller('receipts')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('receipt')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.STAFF)
export class ReceiptsController extends TenantScopedController {
  constructor(private readonly receiptsService: ReceiptsService) {
    super();
  }

  /**
   * Create a receipt for money received
   * POST /receipts
   * Body: CreateReceiptDto
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.RECEIPT.CREATE)
  @Post()
  async create(
    @Body() createReceiptDto: CreateReceiptDto,
    @CurrentUser() user: any,
  ): Promise<ReceiptEntity> {
    return this.receiptsService.createReceipt(
      user.tenantId,
      user.shopId,
      createReceiptDto,
      user.sub,
    );
  }

  /**
   * Get all receipts for authenticated shop
   * GET /receipts?startDate=...&endDate=...&paymentMethod=...&skip=...&take=...
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.RECEIPT.VIEW)
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('shopId') shopId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentMethod') paymentMethod?: PaymentMode,
    @Query('status') status?: ReceiptStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<{ data: ReceiptEntity[]; total: number }> {
    return this.receiptsService.getReceipts(
      user.tenantId,
      shopId || user.shopId,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        paymentMethod,
        status,
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      },
    );
  }

  /**
   * Get single receipt by ID
   * GET /receipts/:id
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.RECEIPT.VIEW)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ReceiptEntity> {
    return this.receiptsService.getReceipt(user.tenantId, user.shopId, id);
  }

  /**
   * Cancel a receipt (soft delete)
   * POST /receipts/:id/cancel
   * Body: { reason: string }
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.RECEIPT.CANCEL)
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ): Promise<ReceiptEntity> {
    return this.receiptsService.cancelReceipt(
      user.tenantId,
      user.shopId,
      id,
      reason,
    );
  }

  /**
   * Get receipt summary by date range
   * GET /receipts/summary?startDate=...&endDate=...
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.RECEIPT.VIEW)
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

    return this.receiptsService.getReceiptSummary(
      user.tenantId,
      shopId || user.shopId,
      start,
      end,
    );
  }
}
