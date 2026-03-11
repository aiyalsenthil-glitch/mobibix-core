import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsVerifyController } from './payments.verify.controller';

import { PaymentRetryController } from './payment-retry.controller';
import { PaymentCleanupCron } from './payment-cleanup.cron';
import { PaymentActivationService } from './payment-activation.service';
import { PaymentRetryService } from './payment-retry.service';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { InvoiceModule } from '../invoices/invoice.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule, // ✅ for PrismaService
    SubscriptionsModule,
    InvoiceModule, // ✅ for InvoiceService
  ],
  providers: [
    PaymentsService,
    PaymentActivationService,
    PaymentRetryService,
    PaymentCleanupCron, // 🆕 Cron job for cleanup
  ],
  controllers: [
    PaymentsController,
    PaymentsVerifyController,
    PaymentRetryController,
  ],
  exports: [PaymentActivationService],
})
export class PaymentsModule {}
