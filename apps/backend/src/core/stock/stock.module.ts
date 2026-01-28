import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StockSummaryController } from './stock-summary.controller';
import { StockSummaryService } from './stock-summary.service';
import { StockKpiController } from './stock-kpi.controller';
import { StockKpiService } from './stock-kpi.service';
import { StockCorrectionController } from './stock-correction.controller';
import { StockCorrectionService } from './stock-correction.service';
import { StockReportController } from './stock-report.controller';
import { StockReportService } from './stock-report.service';

@Module({
  controllers: [
    StockController,
    StockSummaryController,
    StockKpiController,
    StockCorrectionController,
    StockReportController,
  ],
  providers: [
    StockService,
    StockKpiService,
    StockSummaryService,
    StockCorrectionService,
    StockReportService,
    PrismaService,
  ],
  exports: [StockService, StockSummaryService],
})
export class StockModule {}
