import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { CoreModule } from './core/core.module';
import { GymModule } from './modules/gym/gym.module';
import { HealthModule } from './health/health.module';

import { rawBodyMiddleware } from './common/middleware/raw-body.middleware';
import { AuthModule } from './core/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from './core/auth/guards/subscription.guard';
import { CsrfGuard } from './core/auth/guards/csrf.guard';
import { RolesGuard } from './core/auth/guards/roles.guard';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { ScheduleModule } from '@nestjs/schedule';
import { GymAppModule } from './modules/gymapp/gym-app.module';
import { MobileShopModule } from './modules/mobileshop/mobileshop.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheModule as CustomCacheModule } from './core/cache/cache.module';
import { SuppliersModule } from './core/suppliers/suppliers.module';
import { PurchasesModule } from './core/purchases/purchases.module';
import { GlobalProductsModule } from './core/global-products/global-products.module';
import { ShopProductsModule } from './core/shop-products/shop-products.module';
import { CustomerTimelineModule } from './core/timeline/customer-timeline.module';
import { LoyaltyModule } from './core/loyalty/loyalty.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // 🌍 Global env config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 🛡️ Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per TTL
      },
    ]),

    // � Performance & Caching (Tier 4)
    CustomCacheModule,

    // �🔒 Core Engine (ALL core logic lives here)
    CoreModule,
    AuthModule,
    WhatsAppModule,
    CustomerTimelineModule,
    LoyaltyModule, // 🧩 Business modules
    GymModule,
    GymAppModule,
    SuppliersModule,
    PurchasesModule,
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
  controllers: [AppController],
  providers: [
    AppService,
    // ════════════════════════════════════════════════════
    // ✅ SECURITY: APP-LEVEL GUARDS (Applied to ALL endpoints)
    // ════════════════════════════════════════════════════
    // Phase 1 Production Blocker #4: Global guard enforcement
    // All endpoints are protected by default
    // Use @Public() decorator to opt-out (auth, webhooks, etc.)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // ← Validates JWT on all endpoints
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard, // ← Enforces subscription limits
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard, // ← CSRF protection
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // ← Role-based access control
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // ← Rate limiting
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
