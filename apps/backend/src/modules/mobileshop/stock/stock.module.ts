import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { StockSummaryController } from './stock-summary.controller';
import { StockSummaryService } from './stock-summary.service';
import { StockKpiController } from './stock-kpi.controller';
import { StockKpiService } from './stock-kpi.service';

@Module({
  controllers: [StockController, StockSummaryController, StockKpiController],
  providers: [
    StockService,
    StockKpiService,
    StockSummaryService,
    PrismaService,
  ],
  exports: [StockService, StockSummaryService],
})
export class StockModule {}
