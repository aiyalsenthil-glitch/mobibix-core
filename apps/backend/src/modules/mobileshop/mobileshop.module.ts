import { Module } from '@nestjs/common';
import { ShopModule } from './shops/shop.module';
import { JobCardsModule } from './jobcard/job-cards.module';

@Module({
  imports: [ShopModule, JobCardsModule],
})
export class MobileShopModule {}
