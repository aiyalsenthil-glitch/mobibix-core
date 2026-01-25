import { Injectable } from '@nestjs/common';
import { StockService } from './stock.service';

/*
  eslint-disable
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-return
*/

@Injectable()
export class StockSummaryService {
  constructor(private stockService: StockService) {}

  async getSummary(tenantId: string, shopId: string) {
    // validate shop
    return await this.stockService.getStockBalances(tenantId, shopId);
  }
}
