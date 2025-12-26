import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { CoreModule } from './core/core.module';
import { GymModule } from './modules/gym/gym.module';
import { HealthModule } from './health/health.module';

import { rawBodyMiddleware } from './common/middleware/raw-body.middleware';
import { TenantContextInterceptor } from './core/tenant/tenant-context.interceptor';
import { StaffModule } from './core/staff/staff.module';

import { ScheduleModule } from '@nestjs/schedule';

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

    // 🧩 Business modules
    GymModule,

    // 🩺 Platform infra
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
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
