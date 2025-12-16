import { Module } from '@nestjs/common';
import { AdminController } from './core/admin/admin.controller';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuthModule } from './core/auth/auth.module';
import { TenantModule } from './core/tenant/tenant.module';
import { UsersModule } from './core/users/users.module';
import { GymModule } from './modules/gym/gym.module';
import { TenantContextInterceptor } from './core/tenant/tenant-context.interceptor';
import { MembersModule } from './core/members/members.module';
import { BillingModule } from './core/billing/billing.module';

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
    GymModule,
  ],
  controllers: [AdminController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
})
export class AdminModule {}
export class AppModule {}
