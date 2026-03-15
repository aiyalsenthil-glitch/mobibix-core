import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiChatController } from './ai-chat.controller';
import { AiQuotaService } from './ai-quota.service';
import { AiCoreClient } from './ai-core.client';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [AiChatController],
  providers: [AiQuotaService, AiCoreClient],
  exports: [AiQuotaService, AiCoreClient],
})
export class AiModule {}
