import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CoreModule } from './core/core.module';
import { GymModule } from './modules/gym/gym.module';
import { HealthModule } from './health/health.module';

import { rawBodyMiddleware } from './common/middleware/raw-body.middleware';
import { AuthModule } from './core/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { ScheduleModule } from '@nestjs/schedule';
import { GymAppModule } from './modules/gymapp/gym-app.module';
import { MobileShopModule } from './modules/mobileshop/mobileshop.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { CacheModule } from '@nestjs/cache-manager';
import { SuppliersModule } from './core/suppliers/suppliers.module';
import { PurchasesModule } from './core/purchases/purchases.module';
import { GlobalSuppliersModule } from './core/global-suppliers/global-suppliers.module';
import { GlobalProductsModule } from './core/global-products/global-products.module';
import { ShopProductsModule } from './core/shop-products/shop-products.module';
import { CustomerTimelineModule } from './core/timeline/customer-timeline.module';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    // 🌍 Global env config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 🔒 Core Engine (ALL core logic lives here)
    CoreModule,
    AuthModule,
    WhatsAppModule,
    CustomerTimelineModule,
    // 🧩 Business modules
    GymModule,
    GymAppModule,
    SuppliersModule,
    PurchasesModule,
    GlobalSuppliersModule,
    GlobalProductsModule,
    ShopProductsModule,
    // 🩺 Platform infra
    HealthModule,
    MobileShopModule,
    LedgerModule,
    CacheModule.register({
      isGlobal: true,
      ttl: 60,
      max: 1000,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(rawBodyMiddleware).forRoutes({
      path: 'payments/webhook',
      method: RequestMethod.POST,
    });
  }
}
