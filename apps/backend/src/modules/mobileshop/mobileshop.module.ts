import { Module } from '@nestjs/common';
import { ShopModule } from './shops/shop.module';
import { JobCardsModule } from './jobcard/job-cards.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { MobileShopDashboardModule } from './dashboard/mobileshop-dashboard.module';
import { InventoryModule } from './inventory/inventory.module';
import { RepairModule } from './repair/repair.module';
import { SalesModule } from './sales/sales.module';
import { PurchaseModule } from './purchase/purchase.module';

@Module({
  imports: [
    ShopModule,
    JobCardsModule,
    ProductsModule,
    StockModule,
    RepairModule,
    SalesModule,
    PurchaseModule,
    MobileShopDashboardModule,
    InventoryModule,
  ],
})
export class MobileShopModule {}
