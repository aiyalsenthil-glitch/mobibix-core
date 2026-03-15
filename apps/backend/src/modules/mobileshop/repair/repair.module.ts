import { Module } from '@nestjs/common';
import { RepairController } from './repair.controller';
import { RepairService } from './repair.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { StockModule } from '../../../core/stock/stock.module';
import { SalesModule } from '../../../core/sales/sales.module';

@Module({
  imports: [StockModule, SalesModule],
  controllers: [RepairController],
  providers: [RepairService, PrismaService],
  exports: [RepairService],
})
export class RepairModule {}
