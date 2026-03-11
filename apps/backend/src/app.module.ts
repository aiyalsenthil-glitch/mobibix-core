import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';

import { CoreModule } from './core/core.module';
import { GymModule } from './modules/gym/gym.module';
import { HealthModule } from './health/health.module';

import { rawBodyMiddleware } from './common/middleware/raw-body.middleware';
import { AuthModule } from './core/auth/auth.module';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from './core/auth/guards/subscription.guard';
import { CsrfGuard } from './core/auth/guards/csrf.guard';
import { RolesGuard } from './core/auth/guards/roles.guard';
import { TenantContextInterceptor } from './core/tenant/tenant-context.interceptor';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { ScheduleModule } from '@nestjs/schedule';
import { GymAppModule } from './modules/gymapp/gym-app.module';
import { NotificationsModule } from './core/notifications/notifications.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { MobileShopModule } from './modules/mobileshop/mobileshop.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PartnersModule } from './modules/partners/partners.module';
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
import { BullModule } from '@nestjs/bullmq';

import { EventEmitterModule } from '@nestjs/event-emitter';

type RequestUserContext = {
  tenantId?: string;
  userId?: string;
};

type LoggerRequest = {
  headers?: Record<string, string | string[] | undefined>;
  user?: RequestUserContext;
};

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // 🌍 Global env config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    PrometheusModule.register(),

    // 🚀 BullMQ Redis Connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        connection: (process.env.REDIS_URL || {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT
            ? parseInt(process.env.REDIS_PORT)
            : 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        }) as any,
      }),
    }),

    // 🔬 Distributed Systems Observability (Structured JSON Logs)
    LoggerModule.forRoot({
      pinoHttp: {
        level: 'info',
        // Disable automatic per-request logging (too verbose with full headers)
        autoLogging: false,
        // Auto-inject correlation IDs for every request
        genReqId: (req: LoggerRequest) => {
          const requestId = req.headers?.['x-request-id'];
          if (Array.isArray(requestId)) {
            return requestId[0] ?? randomUUID();
          }
          return requestId ?? randomUUID();
        },
        // ✂️ Strip verbose/sensitive fields from every log entry
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            // Only keep non-sensitive, useful headers
            remoteAddress: req.remoteAddress,
            remotePort: req.remotePort,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
        // Format beautifully in dev, raw JSON in prod
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, colorize: true },
              }
            : undefined,
        customProps: (req: any) => {
          return {
            tenantId: req.user?.tenantId || 'anonymous',
            userId: req.user?.sub || 'unauthenticated',
          };
        },
      },
    }),

    // 🛡️ Rate Limiting (Multi-Tier)
    ThrottlerModule.forRoot([
      {
        name: 'default', // Global: 300 requests per minute per IP
        ttl: 60000, // 60 seconds
        limit: 300,
      },
      {
        name: 'user', // Authenticated users: 1500 requests per hour
        ttl: 3600000, // 1 hour
        limit: 1500,
      },
    ]),

    // � Performance & Caching (Tier 4)
    CustomCacheModule,

    // �🔒 Core Engine (ALL core logic lives here)
    CoreModule,
    AuthModule,
    WhatsAppModule,
    NotificationsModule,
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
    WaitlistModule,
    MobileShopModule,
    LedgerModule,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: () => {
        const url = process.env.REDIS_URL;
        return {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          store: require('cache-manager-ioredis'),
          ...(url 
            ? { url } 
            : {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
                password: process.env.REDIS_PASSWORD || undefined,
              }),
          ttl: 60,
        } as any;
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
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
      useClass: CustomThrottlerGuard, // ← Rate limiting with user tracking
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(rawBodyMiddleware).forRoutes(
      { path: 'billing/webhook/REMOVED_PAYMENT_INFRA', method: RequestMethod.POST },
      { path: 'payments/webhook', method: RequestMethod.POST },
    );
  }
}
