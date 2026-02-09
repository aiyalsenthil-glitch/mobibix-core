import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { PurchasesHardeningController } from './purchases-hardening.controller';
import { GSTVerificationService } from './gst-verification.service';
import { PurchaseAuditService } from './purchase-audit.service';
import { StockModule } from '../stock/stock.module';
import { PartiesModule } from '../parties/parties.module';

@Module({
  imports: [PrismaModule, StockModule, PartiesModule],
  providers: [PurchasesService, GSTVerificationService, PurchaseAuditService],
  controllers: [PurchasesController, PurchasesHardeningController],
  exports: [PurchasesService],
})
export class PurchasesModule {}
