import { Controller, Post, Req, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../auth/decorators/public.decorator';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { PaymentStatus } from '@prisma/client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('payments')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Public()
  @Post('webhook')
  async handleWebhook(@Req() req: Request) {
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
        const REMOVED_PAYMENT_INFRAPayment = payload.payload.payment.entity;

        // 1️⃣ Find payment record
        const paymentRecord = await this.prisma.payment.findFirst({
          where: {
            provider: 'RAZORPAY',
            providerOrderId: REMOVED_PAYMENT_INFRAPayment.order_id,
          },
        });

        if (!paymentRecord) {
          this.logger.warn(
            `Payment record not found for order ${REMOVED_PAYMENT_INFRAPayment.order_id}`,
          );
          return { received: true };
        }

        // 2️⃣ Idempotency: if already processed, skip
        if (paymentRecord.status === PaymentStatus.SUCCESS) {
          this.logger.log(`Payment already processed: ${paymentRecord.id}`);
          return { received: true };
        }

        // 3️⃣ Mark payment SUCCESS
        await this.prisma.payment.update({
          where: { id: paymentRecord.id },
          data: {
            providerPaymentId: REMOVED_PAYMENT_INFRAPayment.id,
            status: PaymentStatus.SUCCESS,
            amount: REMOVED_PAYMENT_INFRAPayment.amount / 100,
            currency: REMOVED_PAYMENT_INFRAPayment.currency,
          },
        });

        // 4️⃣ 🔥 ACTIVATE / QUEUE SUBSCRIPTION (THIS WAS MISSING)
        await this.prisma.$transaction(async (tx) => {
          // IMPORTANT: reuse backend business logic
          await this.subscriptionsService.buyPlan(
            paymentRecord.tenantId,
            paymentRecord.planId,
          );
        });

        this.logger.log(
          `Subscription updated for tenant ${paymentRecord.tenantId}`,
        );
      }

      return { received: true };
      // 💰 Handle captured payments
    } catch (err) {
      this.logger.error('Webhook processing error', err);
    }
  }
}
