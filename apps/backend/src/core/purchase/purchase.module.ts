import { Module } from '@nestjs/common';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  controllers: [PurchaseController],
  providers: [PurchaseService, PrismaService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
