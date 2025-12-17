import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuthModule } from './core/auth/auth.module';
import { TenantModule } from './core/tenant/tenant.module';
import { UsersModule } from './core/users/users.module';
import { MembersModule } from './core/members/members.module';
import { BillingModule } from './core/billing/billing.module';
import { AdminModule } from './core/admin/admin.module';
import { PaymentsModule } from './core/billing/payments/payments.module';
import { GymModule } from './modules/gym/gym.module';
import { rawBodyMiddleware } from './common/middleware/raw-body.middleware';

import { TenantContextInterceptor } from './core/tenant/tenant-context.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    TenantModule,
    UsersModule,
    MembersModule,
    BillingModule,
    PaymentsModule,
    AdminModule, // ✅ imported, not redefined
    GymModule,
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
