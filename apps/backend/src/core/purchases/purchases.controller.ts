import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { PERMISSIONS } from '../../security/permission-registry';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto, PurchaseStatus } from './dto/update-purchase.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PurchaseResponseDto } from './dto/purchase.response.dto';
import { UserRole, ModuleType } from '@prisma/client';
import { PurchasePaymentService } from '../../modules/mobileshop/services/purchase-payment.service';

@Controller('purchases')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('inventory')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class PurchasesController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly purchasePaymentService: PurchasePaymentService,
  ) {}

  /**
   * POST /api/purchases
   * Create a new purchase invoice
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.CREATE)
  async create(
    @Req() req: any,
    @Body() dto: CreatePurchaseDto,
  ): Promise<PurchaseResponseDto> {
    return this.purchasesService.create(req.user.tenantId, dto);
  }

  /**
   * GET /api/purchases
   * List all purchases with filters
   * Query params:
   * - shopId?: string
   * - skip?: number
   * - take?: number
   * - status?: DRAFT | SUBMITTED | PARTIALLY_PAID | PAID | CANCELLED
   * - supplierId?: string
   */
  @Get()
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.VIEW)
  async findAll(
    @Req() req: any,
    @Query('shopId') shopId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: PurchaseStatus,
    @Query('supplierId') supplierId?: string,
  ) {
    const skipNum = skip ? Math.max(0, parseInt(skip, 10)) : 0;
    const takeNum = take ? Math.min(100, parseInt(take, 10)) : 50;

    return this.purchasesService.findAll(req.user.tenantId, {
      shopId,
      skip: skipNum,
      take: takeNum,
      status,
      supplierId,
    });
  }

  /**
   * GET /api/purchases/:id
   * Get purchase details by ID
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.VIEW)
  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<PurchaseResponseDto> {
    return this.purchasesService.findOne(req.user.tenantId, id);
  }

  /**
   * PATCH /api/purchases/:id
   * Update purchase details
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.CREATE)
  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseDto,
  ): Promise<PurchaseResponseDto> {
    return this.purchasesService.update(req.user.tenantId, id, dto);
  }

  /**
   * DELETE /api/purchases/:id
   * Cancel purchase (soft delete)
   * Only allowed if no payments have been made
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.CREATE)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<PurchaseResponseDto> {
    return this.purchasesService.remove(req.user.tenantId, id);
  }

  /**
   * POST /api/purchases/:id/pay
   * Record a payment for this purchase
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.CREATE)
  @Post(':id/pay')
  async recordPayment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
  ): Promise<PurchaseResponseDto> {
    return this.purchasesService.recordPayment(req.user.tenantId, id, dto);
  }

  /**
   * GET /api/purchases/:id/outstanding
   * Get outstanding amount for this purchase
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.VIEW)
  @Get(':id/outstanding')
  async getOutstanding(@Req() req: any, @Param('id') id: string) {
    const purchase = await this.purchasesService.findOne(req.user.tenantId, id);
    return {
      purchaseId: purchase.id,
      invoiceNumber: purchase.invoiceNumber,
      grandTotal: purchase.grandTotal,
      paidAmount: purchase.paidAmount,
      outstandingAmount: purchase.outstandingAmount,
      status: purchase.status,
    };
  }

  /**
   * GET /api/purchases/supplier/:supplierId
   * Get all purchases for a supplier
   */
  @Get('supplier/:supplierId')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.VIEW)
  async getBySupplier(
    @Req() req: any,
    @Param('supplierId') supplierId: string,
  ) {
    return this.purchasesService.getBySupplier(req.user.tenantId, supplierId);
  }

  /**
   * GET /api/purchases/supplier/:supplierId/outstanding
   * Get outstanding purchases for a supplier
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.VIEW)
  @Get('supplier/:supplierId/outstanding')
  async getOutstandingBySupplier(
    @Req() req: any,
    @Param('supplierId') supplierId: string,
  ) {
    return this.purchasesService.getOutstandingBySupplier(
      req.user.tenantId,
      supplierId,
    );
  }

  /**
   * GET /api/purchases/pending
   * Get all pending purchases (DRAFT, SUBMITTED, PARTIALLY_PAID)
   * Query params: shopId, supplierId
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.VIEW)
  @Get('pending')
  async getPendingPurchases(
    @Req() req: any,
    @Query('shopId') shopId?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.purchasePaymentService.getPendingPurchases(
      req.user.tenantId,
      shopId,
      supplierId,
    );
  }

  /**
   * GET /api/purchases/:id/payment-status
   * Get payment status with balance due, days overdue
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.VIEW)
  @Get(':id/payment-status')
  async getPaymentStatus(@Req() req: any, @Param('id') id: string) {
    return this.purchasePaymentService.getPurchaseStatus(req.user.tenantId, id);
  }

  /**
   * POST /api/purchases/:id/payments
   * Record a new payment (uses PurchasePaymentService)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.CREATE)
  @Post(':id/payments')
  async recordPaymentV2(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    dto: {
      amount: number;
      paymentMethod?: 'CASH' | 'CARD' | 'UPI' | 'BANK' | 'CREDIT';
      paymentReference?: string;
    },
  ) {
    return this.purchasePaymentService.recordPayment(
      req.user.tenantId,
      id,
      dto.amount,
      dto.paymentMethod || 'CASH',
      dto.paymentReference,
    );
  }

  /**
   * GET /api/purchases/reports/payables-aging
   * Get Payables Aging Report
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.VIEW)
  @Get('reports/payables-aging')
  async getPayablesAging(@Req() req: any, @Query('shopId') shopId?: string) {
    return this.purchasesService.getPayablesAging(req.user.tenantId, shopId);
  }
}
