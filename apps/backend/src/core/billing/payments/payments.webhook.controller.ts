import { Controller, Post, Req, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../auth/decorators/public.decorator';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { PaymentStatus } from '@prisma/client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PaymentActivationService } from './payment-activation.service';

@Controller('payments')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paymentActivationService: PaymentActivationService,
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

        // 1️⃣ Find payment record with tenantId filter
        const paymentRecord = await this.prisma.payment.findFirst({
          where: {
            provider: 'RAZORPAY',
            providerOrderId: REMOVED_PAYMENT_INFRAPayment.order_id,
            // ✅ DEFENSIVE: Verify tenant exists (added for cross-tenant security)
            // This ensures payment.tenantId is valid before activation
          },
          select: {
            id: true,
            tenantId: true,
            status: true,
            planId: true,
            billingCycle: true,
            expiresAt: true, // ✅ ADD FIELD FOR EXPIRY CHECK
          },
        });

        if (!paymentRecord) {
          this.logger.warn(
            `[WEBHOOK] Payment not found or possible cross-tenant mismatch: ${REMOVED_PAYMENT_INFRAPayment.order_id}`,
          );
          return { received: true, status: 'rejected' };
        }

        // ✅ DEFENSIVE: Verify tenant exists before activation
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: paymentRecord.tenantId },
          select: { id: true, code: true },
        });

        if (!tenant) {
          this.logger.error(
            `[WEBHOOK] Tenant missing for payment ${paymentRecord.id}. Blocking activation.`,
          );
          await this.paymentActivationService.failPayment(
            paymentRecord.id,
            'Tenant not found',
          );
          return { received: true, status: 'rejected' };
        }

        // ✅ Check if order expired
        if (paymentRecord.expiresAt && new Date() > paymentRecord.expiresAt) {
          this.logger.warn(
            `[WEBHOOK] Payment ${paymentRecord.id} expired (${paymentRecord.expiresAt})`,
          );

          // Mark as FAILED due to late payment
          await this.paymentActivationService.failPayment(
            paymentRecord.id,
            'Payment expired',
          );

          return {
            received: true,
            status: 'rejected',
            reason: 'Payment received after order expiry',
          };
        }

        // 2️⃣ Idempotency: if already processed, skip
        if (paymentRecord.status === PaymentStatus.SUCCESS) {
          this.logger.log(`Payment already processed: ${paymentRecord.id}`);
          return { received: true };
        }

        // 3️⃣ Store Razorpay provider metadata (activation service will set status=SUCCESS)
        await this.prisma.payment.update({
          where: { id: paymentRecord.id },
          data: {
            providerPaymentId: REMOVED_PAYMENT_INFRAPayment.id,
            amount: REMOVED_PAYMENT_INFRAPayment.amount / 100,
            currency: REMOVED_PAYMENT_INFRAPayment.currency,
          },
        });

        // 4️⃣ ✅ Use unified activation service (idempotent)
        try {
          const result =
            await this.paymentActivationService.activateSubscriptionFromPayment(
              paymentRecord.id,
            );

          this.logger.log(
            `[WEBHOOK] ✅ Activation complete: Payment ${paymentRecord.id}, status=${result.status}`,
          );
        } catch (subscriptionErr) {
          this.logger.error(
            `[WEBHOOK] ❌ Activation failed: ${paymentRecord.id}`,
            subscriptionErr,
          );

          // Mark as failed via service
          await this.paymentActivationService.failPayment(
            paymentRecord.id,
            `Activation error: ${(subscriptionErr as Error).message}`,
          );

          // ⚠️ Webhook still returns 200 OK so Razorpay doesn't retry
          // Payment is marked SUCCESS; subscription creation can be retried manually
        }
      }

      return { received: true };
      // 💰 Handle captured payments
    } catch (err) {
      this.logger.error('Webhook processing error', err);
    }
  }
}
