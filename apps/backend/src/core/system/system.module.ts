import { Module } from '@nestjs/common';
import { WebhookLogsController } from './webhook-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WebhookLogsController],
})
export class SystemModule {}
