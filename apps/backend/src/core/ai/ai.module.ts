import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiChatController } from './ai-chat.controller';
import { AiQuotaService } from './ai-quota.service';
import { AiCoreClient } from './ai-core.client';
import { BusinessContextService } from './business-context.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AiChatController],
  providers: [AiQuotaService, AiCoreClient, BusinessContextService],
  exports: [AiQuotaService, AiCoreClient, BusinessContextService, JwtModule],
})
export class AiModule {}
