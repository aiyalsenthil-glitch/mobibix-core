import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { BillingModule } from '../billing.module';
import { AuthModule } from '../../auth/auth.module'; // ✅ ADD THIS
import { PaymentsVerifyController } from './payments.verify.controller';
import { PaymentsWebhookController } from './payments.webhook.controller';

@Module({
  imports: [
    BillingModule,
    AuthModule, // ✅ REQUIRED for JwtAuthGuard
  ],
  providers: [PaymentsService],
  controllers: [
    PaymentsController,
    PaymentsVerifyController,
    PaymentsWebhookController,
  ],
})
export class PaymentsModule {}
