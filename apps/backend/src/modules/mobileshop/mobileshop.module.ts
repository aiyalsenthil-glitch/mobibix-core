import { Module } from '@nestjs/common';
import { ShopModule } from './shops/shop.module';

@Module({
  imports: [ShopModule],
})
export class MobileShopModule {}
