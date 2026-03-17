import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, BillingModule, ConfigModule],
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}
