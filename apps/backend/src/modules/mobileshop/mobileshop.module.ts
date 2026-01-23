import { Module } from '@nestjs/common';
import { ShopModule } from './shops/shop.module';
import { JobCardsModule } from './jobcard/job-cards.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { MobileShopDashboardModule } from './dashboard/mobileshop-dashboard.module';

@Module({
  imports: [
    ShopModule,
    JobCardsModule,
    ProductsModule,
    StockModule,
    MobileShopDashboardModule,
  ],
})
export class MobileShopModule {}
