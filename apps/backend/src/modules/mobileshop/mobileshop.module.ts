import { Module } from '@nestjs/common';
import { JobCardsModule } from './jobcard/job-cards.module';
import { MobileShopDashboardModule } from './dashboard/mobileshop-dashboard.module';
import { RepairModule } from './repair/repair.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { CrmIntegrationModule } from './crm-integration.module';

@Module({
  imports: [
    JobCardsModule,
    RepairModule,
    MobileShopDashboardModule,
    ReceiptsModule,
    VouchersModule,
    CrmIntegrationModule,
  ],
})
export class MobileShopModule {}
