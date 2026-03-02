import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesPublicController } from './sales.public.controller';
import { SalesService } from './sales.service';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommonModule } from '../../common/common.module';
import { StockModule } from '../stock/stock.module';

import { BillingService } from './billing.service';
import { ReceiptsModule } from '../receipts/receipts.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [CommonModule, ReceiptsModule, LoyaltyModule, StockModule],
  controllers: [SalesController, SalesPublicController],
  providers: [
    SalesService,
    PaymentService,
    PrismaService,
    BillingService,
  ],
  exports: [SalesService, PaymentService, BillingService],
})
export class SalesModule {}
