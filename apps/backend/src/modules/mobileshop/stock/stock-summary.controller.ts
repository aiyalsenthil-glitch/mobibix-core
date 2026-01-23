import {
  Controller,
  Get,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { StockSummaryService } from './stock-summary.service';

@Controller('mobileshop/stock')
export class StockSummaryController {
  constructor(private readonly service: StockSummaryService) {}

  @Get('summary')
  async summary(@Req() req, @Query('shopId') shopId: string) {
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    return this.service.getSummary(tenantId, shopId);
  }
}
