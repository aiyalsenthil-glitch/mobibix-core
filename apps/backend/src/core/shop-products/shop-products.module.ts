import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopProductsService } from './shop-products.service';
import { ShopProductsController } from './shop-products.controller';

@Module({
  imports: [PrismaModule],
  providers: [ShopProductsService],
  controllers: [ShopProductsController],
  exports: [ShopProductsService],
})
export class ShopProductsModule {}
