import {
  Controller,
  Post,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { PurchaseStockInDto } from './dto/purchase-stock-in.dto';

@Controller('mobileshop/stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Post('in/purchase')
  async purchaseIn(@Req() req, @Body() dto: PurchaseStockInDto) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    return this.service.purchaseStockIn(tenantId, dto);
  }
}
