import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { PurchaseService } from './purchase.service';
import { PurchaseStockInDto } from './dto/purchase-stock-in.dto';

@Controller('mobileshop/purchase')
@UseGuards(JwtAuthGuard)
export class PurchaseController {
  constructor(private readonly service: PurchaseService) {}

  @Post('stock-in')
  async stockIn(@Req() req: any, @Body() dto: PurchaseStockInDto) {
    const tenantId = req.user?.sub || req.user?.userId;
    return this.service.stockIn(tenantId, dto);
  }
}
