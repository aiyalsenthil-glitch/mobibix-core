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
import { CompatibilityModule } from './compatibility/compatibility.module';
import { OperationsModule } from './operations/operations.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { RepairIntelligenceModule } from './repair-intelligence/repair-intelligence.module';
import { TradeInModule } from './tradein/tradein.module';
import { FinanceModule } from './finance/finance.module';
import { EWayBillModule } from './ewaybill/ewaybill.module';

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
    CompatibilityModule,
    OperationsModule,
    KnowledgeModule,
    RepairIntelligenceModule,
    TradeInModule,
    FinanceModule,
    EWayBillModule,
  ],
})
export class MobileShopModule {}
