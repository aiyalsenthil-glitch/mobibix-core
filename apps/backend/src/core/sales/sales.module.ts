import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [SalesController],
  providers: [SalesService, PaymentService, PrismaService, StockService],
  exports: [SalesService, PaymentService],
})
export class SalesModule {}
