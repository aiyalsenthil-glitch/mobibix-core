import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsVerifyController } from './payments.verify.controller';
import { PaymentsWebhookController } from './payments.webhook.controller';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule, // ✅ for PrismaService
    SubscriptionsModule,
  ],
  providers: [PaymentsService],
  controllers: [
    PaymentsController,
    PaymentsVerifyController,
    PaymentsWebhookController,
  ],
})
export class PaymentsModule {}
