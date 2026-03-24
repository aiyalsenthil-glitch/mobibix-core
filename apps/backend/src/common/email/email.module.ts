import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailListener } from './email.listener';
import { EmailController } from './email.controller';
import { EmailWebhookController } from './email-webhook.controller';
import { PrismaService } from '../../core/prisma/prisma.service';

@Global()
@Module({
  controllers: [EmailController, EmailWebhookController],
  providers: [EmailService, EmailListener, PrismaService],
  exports: [EmailService],
})
export class EmailModule {}

