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

        // 🆕 Check if order expired
        if (paymentRecord.expiresAt && new Date() > paymentRecord.expiresAt) {
          this.logger.warn(
            `Payment ${paymentRecord.id} received after expiry (${paymentRecord.expiresAt})`,
          );

          // Mark as FAILED due to late payment
          await this.prisma.payment.update({
            where: { id: paymentRecord.id },
            data: {
              status: PaymentStatus.FAILED,
              providerPaymentId: REMOVED_PAYMENT_INFRAPayment.id, // Store for reference
            },
          });

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

        // 4️⃣ 🔥 ACTIVATE SUBSCRIPTION IMMEDIATELY (WEBHOOK IS SOURCE OF TRUTH)
        try {
          await this.prisma.$transaction(async (tx) => {
            // Resolve module from tenant type
            const tenant = await tx.tenant.findUnique({
              where: { id: paymentRecord.tenantId },
              select: { tenantType: true },
            });

            // 🔐 SECURITY FIX: Fetch PLAN to determine target module (WHATSAPP_CRM vs GYM vs MOBILE_SHOP)
            // Use tx to ensure we are in the same transaction
            const paymentWithPlan = await tx.payment.findUnique({
              where: { id: paymentRecord.id },
            });

            if (!paymentWithPlan) {
              this.logger.error(
                `❌ Payment record not found ${paymentRecord.id}`,
              );
              return;
            }

            const plan = await tx.plan.findUnique({
              where: { id: paymentRecord.planId },
              select: { module: true },
            });

            if (!plan) {
              this.logger.error(
                `❌ Plan not found for payment ${paymentRecord.id}`,
              );
              return;
            }

            const module = plan.module;

            this.logger.log(
              `Using module from plan: ${module} for tenant ${paymentRecord.tenantId}`,
            );

            // ✅ BILLINGCYCLE IS STORED IN PAYMENT TABLE - use it directly
            await this.subscriptionsService.buyPlanPhase1({
              tenantId: paymentRecord.tenantId,
              planId: paymentRecord.planId,
              module,
              billingCycle: paymentRecord.billingCycle,
            });
          });

          this.logger.log(
            `✅ Subscription created for tenant ${paymentRecord.tenantId} via webhook`,
          );
        } catch (subscriptionErr) {
          this.logger.error(
            `❌ Failed to create subscription after payment: ${paymentRecord.tenantId}`,
            subscriptionErr,
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
