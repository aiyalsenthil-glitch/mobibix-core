import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsVerifyController } from './payments.verify.controller';
import { PaymentsWebhookController } from './payments.webhook.controller';
import { PaymentCleanupCron } from './payment-cleanup.cron';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule, // ✅ for PrismaService
    SubscriptionsModule,
  ],
  providers: [
    PaymentsService,
    PaymentCleanupCron, // 🆕 Cron job for cleanup
  ],
  controllers: [
    PaymentsController,
    PaymentsVerifyController,
    PaymentsWebhookController,
  ],
})
export class PaymentsModule {}
