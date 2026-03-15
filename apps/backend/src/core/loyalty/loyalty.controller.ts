import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  Req,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoyaltyService } from './loyalty.service';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

interface ValidateRedemptionDto {
  customerId: string;
  points: number;
  invoiceSubTotal: number;
}

interface CreateManualAdjustmentDto {
  customerId: string;
  points: number;
  reason: string;
}

interface UpdateLoyaltyConfigDto {
  isEnabled?: boolean;
  earnAmountPerPoint?: number;
  pointsPerEarnUnit?: number;
  pointValueInRupees?: number;
  maxRedeemPercent?: number;
  allowOnRepairs?: boolean;
  allowOnAccessories?: boolean;
  allowOnServices?: boolean;
  expiryDays?: number | null;
  allowManualAdjustment?: boolean;
  minInvoiceForEarn?: number | null;
  shopId?: string;
}

@Controller('loyalty')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class LoyaltyController {
  constructor(private loyaltyService: LoyaltyService) {}

  /**
   * Get all loyalty transactions for the tenant (Dashboard view)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LOYALTY.VIEW)
  @Get('transactions')
  async getAllTransactions(@Req() req: any, @Query('shopId') shopId?: string) {
    const tenantId = req.user.tenantId;
    const transactions = await this.loyaltyService.getTransactionHistory(
      tenantId,
      undefined,
      shopId,
      100,
    );
    return { transactions };
  }

  /**
   * Get global loyalty statistics for the tenant
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LOYALTY.VIEW)
  @Get('summary')
  async getSummary(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    const tenantId = req.user.tenantId;

    // Default to current month if dates not provided
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await this.loyaltyService.getTenantStats(
      tenantId,
      start,
      end,
      shopId,
    );
    return stats;
  }

  /**
   * Get customer's current loyalty balance
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LOYALTY.VIEW)
  @Get('balance/:customerId')
  async getBalance(
    @Req() req: any,
    @Param('customerId') customerId: string,
    @Query('shopId') shopId?: string,
  ) {
    const tenantId = req.user.tenantId;

    if (!customerId || customerId === 'undefined' || customerId === 'null') {
      return { customerId: 'unknown', balance: 0, pointValueInRupees: 0 };
    }

    const balance = await this.loyaltyService.getCustomerBalance(
      tenantId,
      customerId,
      shopId,
    );

    return { customerId, balance, pointValueInRupees: balance * 1.0 };
  }

  /**
   * Get customer's loyalty transaction history
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LOYALTY.VIEW)
  @Get('history/:customerId')
  async getHistory(
    @Req() req: any,
    @Param('customerId') customerId: string,
    @Query('shopId') shopId?: string,
  ) {
    const tenantId = req.user.tenantId;

    if (!customerId || customerId === 'undefined' || customerId === 'null') {
      return { customerId: 'unknown', transactions: [] };
    }

    const transactions = await this.loyaltyService.getTransactionHistory(
      tenantId,
      customerId,
      shopId,
      100,
    );

    return { customerId, transactions };
  }

  /**
   * Validate if customer can redeem points
   * Returns: success status, max points allowed, discount amount in paisa
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LOYALTY.VIEW)
  @Post('validate-redemption')
  async validateRedemption(
    @Req() req: any,
    @Body() dto: ValidateRedemptionDto,
  ) {
    const tenantId = req.user.tenantId;

    if (!dto.customerId || dto.points <= 0 || !dto.invoiceSubTotal) {
      throw new BadRequestException('Invalid redemption parameters');
    }

    const validation = await this.loyaltyService.validateRedemption(
      tenantId,
      dto.customerId,
      dto.points,
      dto.invoiceSubTotal,
      (dto as any).shopId,
    );

    return validation;
  }

  /**
   * Create manual loyalty adjustment (admin only)
   * Used for corrections, refunds, or special promotions
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LOYALTY.MANAGE)
  @Post('manual-adjustment')
  async createManualAdjustment(
    @Req() req: any,
    @Body() dto: CreateManualAdjustmentDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const userName = req.user.name || 'System';

    if (!dto.customerId || !dto.reason) {
      throw new BadRequestException('customerId and reason are required');
    }

    const adjustment = await this.loyaltyService.createManualAdjustment(
      tenantId,
      dto.customerId,
      dto.points,
      dto.reason,
      userId,
      userName,
      (dto as any).shopId,
    );

    return {
      message: 'Manual adjustment created successfully',
      adjustment,
    };
  }

  /**
   * Get current tenant's loyalty configuration
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LOYALTY.VIEW)
  @Get('config')
  async getConfig(@Req() req: any, @Query('shopId') shopId?: string) {
    const tenantId = req.user.tenantId;
    const config = await this.loyaltyService.getConfig(tenantId, shopId);
    return config;
  }

  /**
   * Update tenant's loyalty configuration
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.LOYALTY.MANAGE)
  @Put('config')
  async updateConfig(@Req() req: any, @Body() dto: UpdateLoyaltyConfigDto) {
    const tenantId = req.user.tenantId;

    const updatedConfig = await this.loyaltyService.updateConfig(
      tenantId,
      dto.shopId,
      dto,
    );

    return {
      message: 'Loyalty configuration updated successfully',
      config: updatedConfig,
    };
  }
}
