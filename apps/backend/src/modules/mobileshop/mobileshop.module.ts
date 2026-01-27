import { Module } from '@nestjs/common';
import { JobCardsModule } from './jobcard/job-cards.module';
import { MobileShopDashboardModule } from './dashboard/mobileshop-dashboard.module';
import { RepairModule } from './repair/repair.module';

@Module({
  imports: [
    JobCardsModule,
    RepairModule,
    MobileShopDashboardModule,
  ],
})
export class MobileShopModule {}
