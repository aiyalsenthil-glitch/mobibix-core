import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SalesController],
  providers: [SalesService, PaymentService, PrismaService],
  exports: [SalesService, PaymentService],
})
export class SalesModule {}
