import { Controller, Post, Req, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../auth/decorators/public.decorator';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { PaymentStatus } from '@prisma/client';

@Controller('payments')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post('webhook')
  async handleWebhook(@Req() req: Request) {
    console.log('🔥 RAZORPAY WEBHOOK HIT');

    try {
      const signature = req.headers['x-REMOVED_PAYMENT_INFRA-signature'] as string;
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!signature || !secret) {
        this.logger.warn('Missing webhook signature or secret');
        return;
      }

      const rawBody: Buffer = (req as any).rawBody;
      if (!rawBody) {
        this.logger.warn('Raw body missing');
        return;
      }

      // 🔐 Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        this.logger.warn('Invalid webhook signature');
        return;
      }

      // ✅ Parse payload ONLY AFTER signature verification
      const payload = JSON.parse(rawBody.toString());
      const event = payload.event;

      this.logger.log(`🔔 Razorpay webhook received: ${event}`);

      // 📌 Store webhook event for admin dashboard (recommended)
      await this.prisma.webhookEvent.create({
        data: {
          provider: 'RAZORPAY',
          eventType: event,
          referenceId:
            payload.payload?.payment?.entity?.id ??
            payload.payload?.order?.entity?.id ??
            null,
          payload: payload,
        },
      });
      if (event === 'payment.captured') {
        const payment = payload.payload.payment.entity;

        await this.prisma.payment.updateMany({
          where: {
            providerOrderId: payment.order_id,
          },
          data: {
            providerPaymentId: payment.id,
            status: PaymentStatus.SUCCESS,
            amount: payment.amount / 100,
            currency: payment.currency,
          },
        });
      }
      return { received: true };
      // 💰 Handle captured payments
    } catch (err) {
      this.logger.error('Webhook processing error', err);
    }
  }
}
