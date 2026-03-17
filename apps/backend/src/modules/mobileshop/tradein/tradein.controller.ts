import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TradeInService } from './tradein.service';
import { CreateTradeInDto, UpdateTradeInStatusDto } from './dto/tradein.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { TradeInStatus } from '@prisma/client';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { TradeInIntelligenceService } from './tradein-intelligence.service';

class UpdateOfferDto {
  @IsNumber()
  offeredValue: number;
}

class AutoGradeDto {
  @IsObject()
  conditionChecks: Record<string, boolean>;
  @IsNumber()
  marketValue: number;
}

class AddToInventoryDto {
  @IsOptional()
  @IsNumber()
  salePrice?: number;
}

class RedeemVoucherDto {
  @IsString()
  voucherCode: string;
  @IsString()
  shopId: string;
  @IsString()
  invoiceId: string;
}

class CompletePayoutDto {
  @IsString()
  payoutMode: 'CASH' | 'UPI' | 'BANK';
}

@Controller('trade-in')
@UseGuards(JwtAuthGuard)
export class TradeInController {
  constructor(
    private readonly service: TradeInService,
    private readonly intelligence: TradeInIntelligenceService,
  ) {}

  @Post()
  @Permissions(Permission.SALES_CREATE)
  create(@Req() req, @Body() dto: CreateTradeInDto) {
    return this.service.create(req.user.tenantId, req.user.userId, dto);
  }

  @Get()
  @Permissions(Permission.SALES_VIEW)
  list(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('status') status?: TradeInStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(req.user.tenantId, shopId, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search: search?.trim() || undefined,
    });
  }

  @Get('price-intel')
  @Permissions(Permission.SALES_VIEW)
  getPriceIntel(
    @Req() req: any,
    @Query('brand') brand: string,
    @Query('model') model: string,
    @Query('storage') storage?: string,
  ) {
    return this.service.getPriceIntel(req.user.tenantId, brand, model, storage);
  }

  // ─── Voucher endpoints (before /:id to avoid param conflict) ───────────────

  @Get('vouchers')
  @Permissions(Permission.SALES_VIEW)
  getCustomerVouchers(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('customerId') customerId?: string,
    @Query('phone') phone?: string,
  ) {
    return this.service.getCustomerVouchers(req.user.tenantId, shopId, customerId, phone);
  }

  @Get('vouchers/validate')
  @Permissions(Permission.SALES_VIEW)
  validateVoucher(
    @Req() req,
    @Query('code') code: string,
    @Query('shopId') shopId: string,
  ) {
    return this.service.validateVoucher(req.user.tenantId, shopId, code);
  }

  @Post('vouchers/redeem')
  @Permissions(Permission.SALES_CREATE)
  redeemVoucher(@Req() req, @Body() dto: RedeemVoucherDto) {
    return this.service.redeemVoucher(
      req.user.tenantId,
      dto.shopId,
      dto.voucherCode,
      dto.invoiceId,
    );
  }

  // ─── Single trade-in endpoints ─────────────────────────────────────────────

  @Get(':id')
  @Permissions(Permission.SALES_VIEW)
  getOne(@Req() req, @Param('id') id: string) {
    return this.service.getOne(req.user.tenantId, id);
  }

  @Patch(':id/status')
  @Permissions(Permission.SALES_CREATE)
  updateStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateTradeInStatusDto,
  ) {
    return this.service.updateStatus(req.user.tenantId, id, dto);
  }

  @Patch(':id/offer')
  @Permissions(Permission.SALES_CREATE)
  updateOffer(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.service.updateOffer(req.user.tenantId, id, dto.offeredValue);
  }

  @Post(':id/add-to-inventory')
  @Permissions(Permission.SALES_CREATE)
  addToInventory(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: AddToInventoryDto,
  ) {
    return this.service.addToInventory(req.user.tenantId, id, req.user.userId, dto);
  }

  @Post(':id/issue-voucher')
  @Permissions(Permission.SALES_CREATE)
  issueCreditVoucher(@Req() req, @Param('id') id: string) {
    return this.service.issueCreditVoucher(req.user.tenantId, id, req.user.userId);
  }

  @Post(':id/payout')
  @Permissions(Permission.SALES_CREATE)
  completePayout(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: CompletePayoutDto,
  ) {
    return this.service.completePayout(req.user.tenantId, id, dto.payoutMode);
  }

  @Post('auto-grade')
  @Permissions(Permission.SALES_VIEW)
  autoGrade(@Body() dto: AutoGradeDto) {
    const result = this.intelligence.autoGrade(dto.conditionChecks);
    return {
      ...result,
      suggestedOffer: this.intelligence.suggestValue(dto.marketValue, result.grade),
    };
  }
}
