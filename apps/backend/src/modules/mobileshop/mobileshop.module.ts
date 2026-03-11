import { Module } from '@nestjs/common';
import { JobCardsModule } from './jobcard/job-cards.module';
import { MobileShopDashboardModule } from './dashboard/mobileshop-dashboard.module';
import { RepairModule } from './repair/repair.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { CrmIntegrationModule } from './crm-integration.module';
import { MobileShopReportsModule } from './reports/reports.module';
import { B2BModule } from './b2b/b2b.module';
import { QuotationsModule } from './quotations/quotations.module';
import { CreditNotesModule } from './credit-notes/credit-notes.module';

@Module({
  imports: [
    JobCardsModule,
    RepairModule,
    MobileShopDashboardModule,
    ReceiptsModule,
    VouchersModule,
    CrmIntegrationModule,
    MobileShopReportsModule,
    B2BModule,
    QuotationsModule,
    CreditNotesModule,
  ],
})
export class MobileShopModule {}
