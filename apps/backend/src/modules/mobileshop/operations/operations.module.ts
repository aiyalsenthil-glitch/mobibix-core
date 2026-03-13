import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../core/prisma/prisma.module';
import { VouchersModule } from '../vouchers/vouchers.module';

import { DailyClosingService } from './daily-closing/daily-closing.service';
import { DailyClosingController } from './daily-closing/daily-closing.controller';
import { CashModule } from './cash/cash.module';

import { ExpensesService } from './expenses/expenses.service';
import { ExpensesController } from './expenses/expenses.controller';

import { StockVerificationService } from './stock-verification/stock-verification.service';
import { StockVerificationController } from './stock-verification/stock-verification.controller';

import { MonthlyReportService } from './monthly-report/monthly-report.service';
import { MonthlyReportController } from './monthly-report/monthly-report.controller';

import { ShrinkageService } from './shrinkage/shrinkage.service';
import { ShrinkageController } from './shrinkage/shrinkage.controller';

@Module({
  imports: [PrismaModule, VouchersModule, CashModule],
  controllers: [
    DailyClosingController,
    ExpensesController,
    StockVerificationController,
    MonthlyReportController,
    ShrinkageController,
  ],
  providers: [
    DailyClosingService,
    ExpensesService,
    StockVerificationService,
    MonthlyReportService,
    ShrinkageService,
  ],
  exports: [
    DailyClosingService,
    CashModule, // Exporting the module instead of just the service
    ExpensesService,
    StockVerificationService,
    MonthlyReportService,
    ShrinkageService,
  ],
})
export class OperationsModule {}
