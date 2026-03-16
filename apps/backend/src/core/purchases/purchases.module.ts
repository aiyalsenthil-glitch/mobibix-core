import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { GRNController } from './grn.controller';
import { GRNService } from './grn.service';
import { PurchasesHardeningController } from './purchases-hardening.controller';
import { GSTVerificationService } from './gst-verification.service';
import { PurchaseAuditService } from './purchase-audit.service';
import { StockModule } from '../stock/stock.module';
import { PartiesModule } from '../parties/parties.module';
import { PurchasePaymentService } from '../../modules/mobileshop/services/purchase-payment.service';
import { PriceAlertController } from './price-alert.controller';

@Module({
  imports: [PrismaModule, StockModule, PartiesModule],
  providers: [
    PurchasesService,
    PurchaseOrderService,
    GRNService,
    GSTVerificationService,
    PurchaseAuditService,
    PurchasePaymentService,
  ],
  controllers: [
    PurchasesController,
    PurchaseOrderController,
    GRNController,
    PurchasesHardeningController,
    PriceAlertController,
  ],
  exports: [PurchasesService, PurchaseOrderService, GRNService],
})
export class PurchasesModule {}
