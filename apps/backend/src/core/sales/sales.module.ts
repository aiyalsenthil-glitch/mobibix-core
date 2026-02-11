import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CommonModule } from '../../common/common.module';

import { BillingService } from './billing.service';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [CommonModule, ReceiptsModule],
  controllers: [SalesController],
  providers: [SalesService, PaymentService, PrismaService, StockService, BillingService],
  exports: [SalesService, PaymentService, BillingService],
})
export class SalesModule {}
