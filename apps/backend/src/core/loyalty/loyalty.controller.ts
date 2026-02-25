import {
  Controller,
  Get,
  Post,
  Put,
  Body,
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
import { UserRole } from '@prisma/client';

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
}

@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class LoyaltyController {
  constructor(private loyaltyService: LoyaltyService) {}

  /**
   * Get customer's current loyalty balance
   */
  @Get('balance/:customerId')
  async getBalance(@Req() req: any, @Param('customerId') customerId: string) {
    const tenantId = req.user.tenantId;
    
    // Explicitly validate customerId presence
    if (!customerId || customerId === 'undefined' || customerId === 'null') {
      return { customerId: 'unknown', balance: 0, pointValueInRupees: 0 };
    }

    const balance = await this.loyaltyService.getCustomerBalance(
      tenantId,
      customerId,
    );
    
    return { customerId, balance, pointValueInRupees: balance * 1.0 }; 
  }

  /**
   * Validate if customer can redeem points
   * Returns: success status, max points allowed, discount amount in paisa
   */
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
    );

    return validation;
  }

  /**
   * Create manual loyalty adjustment (admin only)
   * Used for corrections, refunds, or special promotions
   */
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
    );

    return {
      message: 'Manual adjustment created successfully',
      adjustment,
    };
  }

  /**
   * Get current tenant's loyalty configuration
   */
  @Get('config')
  async getConfig(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const config = await this.loyaltyService.getConfig(tenantId);
    return config;
  }

  /**
   * Update tenant's loyalty configuration
   */
  @Put('config')
  async updateConfig(@Req() req: any, @Body() dto: UpdateLoyaltyConfigDto) {
    const tenantId = req.user.tenantId;

    const updatedConfig = await this.loyaltyService.updateConfig(tenantId, dto);

    return {
      message: 'Loyalty configuration updated successfully',
      config: updatedConfig,
    };
  }
}
