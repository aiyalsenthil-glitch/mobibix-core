// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './core/auth/auth.module';
import { AppController } from './app.controller';
import { TenantModule } from './core/tenant/tenant.module';
import { GymModule } from './modules/gym/gym.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    TenantModule,
    GymModule,
    // other modules...
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
