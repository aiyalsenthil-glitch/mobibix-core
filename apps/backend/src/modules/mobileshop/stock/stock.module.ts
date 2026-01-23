import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { RepairController } from './repair.controller';
import { RepairService } from './repair.service';
import { StockSummaryController } from './stock-summary.controller';
import { StockSummaryService } from './stock-summary.service';
import { StockKpiController } from './stock-kpi.controller';
import { StockKpiService } from './stock-kpi.service';

@Module({
  controllers: [
    StockController,
    SalesController,
    RepairController,
    StockSummaryController,
    StockKpiController,
  ],
  providers: [
    StockService,
    SalesService,
    RepairService,
    StockKpiService,
    StockSummaryService,
    PrismaService,
  ],
})
export class StockModule {}
