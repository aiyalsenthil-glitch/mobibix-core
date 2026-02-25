import {
  Controller,
  Post,
  Headers,
  Body,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { RazorpayService } from './REMOVED_PAYMENT_INFRA.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  SubscriptionStatus,
  PaymentStatus,
  AutopayStatus,
  BillingType,
} from '@prisma/client';

import { SubscriptionsService } from './subscriptions/subscriptions.service';
import { InvoiceService } from './invoices/invoice.service';

@Controller('billing/webhook/REMOVED_PAYMENT_INFRA')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly REMOVED_PAYMENT_INFRAService: RazorpayService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Post()
  async handleWebhook(
    @Headers('x-REMOVED_PAYMENT_INFRA-signature') signature: string,
    @Body() body: any,
  ) {
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      throw new BadRequestException('Webhook configuration error');
    }

    if (
      !this.REMOVED_PAYMENT_INFRAService.validateWebhookSignature(body, signature, secret)
    ) {
      this.logger.warn('Invalid Razorpay Webhook Signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = body.event;
    const eventId = body.headers?.['x-REMOVED_PAYMENT_INFRA-event-id'] || body.id; // Usually available in header or body

    this.logger.log(`Received Razorpay Webhook: ${event} [${eventId}]`);

    if (!eventId) {
      this.logger.warn(`Webhook missing event ID, forcing processing...`);
    } else {
      try {
        // Enforce Idempotency using the new Postgres WebhookEvent table
        await this.prisma.webhookEvent.create({
          data: {
            provider: 'RAZORPAY',
            eventType: event,
            referenceId: eventId,
            status: 'PROCESSING',
            payload: body.payload || {}
          },
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          this.logger.log(`Idempotent Ignore: Webhook ${eventId} already processed.`);
          return { status: 'ok', message: 'Already processed' };
        }
        // If it's a different DB error, we can attempt to continue or throw
        this.logger.error(`Failed to lock webhook event ${eventId}`, err);
      }
    }

    try {
      switch (event) {
        // ──────────────────────────────────────────────
        // 1. MANUAL PAYMENT SUCCESS
        // ──────────────────────────────────────────────
        case 'payment.captured':
          await this.handlePaymentCaptured(body.payload.payment.entity);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(body.payload.payment.entity);
          break;

        // ──────────────────────────────────────────────
        // 2. AUTOPAY EVENTS
        // ──────────────────────────────────────────────
        case 'subscription.activated':
          await this.handleSubscriptionActivated(
            body.payload.subscription.entity,
          );
          break;

        case 'subscription.charged':
          await this.handleSubscriptionCharged(
            body.payload.subscription.entity,
            body.payload.payment.entity,
          );
          break;

        case 'subscription.halted':
          await this.handleSubscriptionHalted(body.payload.subscription.entity);
          break;

        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(
            body.payload.subscription.entity,
          );
          break;

        default:
          this.logger.log(`Unhandled event: ${event}`);
      }
      // Mark webhook as processed
      if (eventId) {
        await this.prisma.webhookEvent.updateMany({
          where: { provider: 'RAZORPAY', referenceId: eventId },
          data: { status: 'SUCCESS', processedAt: new Date() },
        }).catch(err => this.logger.error('Failed to update processed status', err));
      }

    } catch (err) {
      this.logger.error(`Error handling webhook ${event}`, err);

      if (eventId) {
        await this.prisma.webhookEvent.updateMany({
          where: { provider: 'RAZORPAY', referenceId: eventId },
          data: { status: 'FAILED', error: err.message },
        }).catch(err => this.logger.error('Failed to log error status', err));
      }

      // Return 200 to acknowledge webhook even if processing fails to prevent retries
      return { status: 'error', message: err.message };
    }

    return { status: 'ok' };
  }

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  private async handlePaymentCaptured(payment: any) {
    this.logger.log(`Payment Captured: ${payment.id} for ₹${payment.amount / 100}`);

    // If there is an associated payment link for this payment
    // We look up the TenantSubscription by providerPaymentLinkId
    const paymentLinkId = payment.payment_link_id; // Might or might not exist directly on payment entity based on Razorpay integration version

    // We can also lookup our own internal 'Payment' record first
    const internalPayment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: payment.id },
      include: { tenant: true }
    });

    if (internalPayment) {
        // Activate standard manual payment
        const activeSub = await this.prisma.tenantSubscription.findFirst({
            where: { tenantId: internalPayment.tenantId, planId: internalPayment.planId, status: 'PENDING' },
            orderBy: { createdAt: 'desc' }
        });

        if (activeSub) {
             const endDate = this.subscriptionsService['calculateEndDate'](new Date(), activeSub.billingCycle || 'MONTHLY');
             
             await this.prisma.$transaction(async (tx) => {
                 await tx.payment.update({
                     where: { id: internalPayment.id },
                     data: { status: 'SUCCESS' }
                 });

                 await tx.tenantSubscription.update({
                    where: { id: activeSub.id },
                    data: {
                      status: SubscriptionStatus.ACTIVE,
                      paymentStatus: PaymentStatus.SUCCESS,
                      updatedAt: new Date(),
                      startDate: new Date(),
                      endDate: endDate
                    },
                 });
             });
             this.logger.log(`✅ TenantSubscription ${activeSub.id} activated (Manual).`);
        } else {
             await this.prisma.payment.update({
                 where: { id: internalPayment.id },
                 data: { status: 'SUCCESS' }
             });
        }

        // Generate Invoice
        try {
            await this.invoiceService.createInvoiceForPayment(internalPayment.id);
        } catch(invErr) {
            this.logger.error(`Failed to generate invoice for payment ${internalPayment.id}`, invErr);
        }

    } else if (paymentLinkId) {
         const subscription = await this.prisma.tenantSubscription.findFirst({
            where: { providerPaymentLinkId: paymentLinkId }
         });

         if (subscription) {
            await this.prisma.tenantSubscription.update({
                where: { id: subscription.id },
                data: {
                  status: SubscriptionStatus.ACTIVE,
                  paymentStatus: PaymentStatus.SUCCESS,
                  updatedAt: new Date(),
                },
            });
            this.logger.log(`✅ TenantSubscription ${subscription.id} activated (PaymentLink).`);
         }
    }
  }

  private async handleSubscriptionActivated(subEntity: any) {
    const subId = subEntity.id;
    this.logger.log(`Subscription Activated: ${subId}`);

    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: { providerSubscriptionId: subId },
    });

    if (subscription) {
      await this.prisma.tenantSubscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          autopayStatus: AutopayStatus.ACTIVE,
          paymentStatus: PaymentStatus.SUCCESS,
          // Update dates from Razorpay if available
          startDate: subEntity.current_start
            ? new Date(subEntity.current_start * 1000)
            : undefined,
          endDate: subEntity.current_end
            ? new Date(subEntity.current_end * 1000)
            : undefined,
          updatedAt: new Date(),
        },
      });
      this.logger.log(
        `✅ TenantSubscription ${subscription.id} activated (AutoPay).`,
      );
    } else {
      this.logger.warn(`Subscription ${subId} not found in DB.`);
    }
  }

  private async handleSubscriptionCharged(subEntity: any, paymentEntity: any) {
    const subId = subEntity.id;
    this.logger.log(
      `Subscription Charged: ${subId}, Payment: ${paymentEntity.id}`,
    );

    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: { providerSubscriptionId: subId },
      orderBy: { createdAt: 'desc' } // ensure we grab the most recent if dupes exist
    });

    if (subscription) {
      // Instead of mutating the old row which destroys billing history ledger,
      // we must use the official SubscriptionsService.renewSubscription logic to generate a new row.

      try {
        await this.subscriptionsService.renewSubscription(subscription.id);
        this.logger.log(
          `✅ TenantSubscription ${subscription.id} renewed (AutoPay webhook ledger action).`,
        );

        // Retrieve the newly created subscription to attach the provider tracking back
        const latestSub = await this.prisma.tenantSubscription.findFirst({
            where: { tenantId: subscription.tenantId, module: subscription.module, status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' }
        });

        if (latestSub && latestSub.id !== subscription.id) {
            await this.prisma.tenantSubscription.update({
                where: { id: latestSub.id },
                data: {
                    providerSubscriptionId: subscription.providerSubscriptionId, 
                    autopayStatus: AutopayStatus.ACTIVE,
                    paymentStatus: PaymentStatus.SUCCESS
                }
            });
        }

        // Create Payment record for the Autopay charge so we can generate an invoice
        let internalPayment = await this.prisma.payment.findFirst({
            where: { providerPaymentId: paymentEntity.id }
        });

        if (!internalPayment) {
            internalPayment = await this.prisma.payment.create({
                data: {
                    tenantId: latestSub?.tenantId || subscription.tenantId,
                    planId: latestSub?.planId || subscription.planId,
                    billingCycle: latestSub?.billingCycle || subscription.billingCycle || 'MONTHLY',
                    priceSnapshot: latestSub?.priceSnapshot || paymentEntity.base_amount || paymentEntity.amount,
                    amount: paymentEntity.amount,
                    currency: paymentEntity.currency || 'INR',
                    status: 'SUCCESS',
                    provider: 'RAZORPAY',
                    providerOrderId: paymentEntity.order_id || `autopay_${Date.now()}`,
                    providerPaymentId: paymentEntity.id,
                }
            });
        }

        // Generate Invoice
        try {
            await this.invoiceService.createInvoiceForPayment(internalPayment.id);
            this.logger.log(`✅ Invoice generated for AutoPay payment ${internalPayment.id}`);
        } catch(invErr) {
            this.logger.error(`Failed to generate invoice for AutoPay payment ${internalPayment.id}`, invErr);
        }

      } catch (renewalErr) {
          this.logger.error(`Sub renewal failed for ${subscription.id} via webhook`, renewalErr);
      }
    }
  }

  private async handleSubscriptionHalted(subEntity: any) {
    const subId = subEntity.id;
    this.logger.warn(`Subscription Halted: ${subId}`);

    await this.prisma.tenantSubscription.updateMany({
      where: { providerSubscriptionId: subId },
      data: {
        autopayStatus: AutopayStatus.HALTED,
        paymentStatus: PaymentStatus.FAILED, // Usually implies payment failure
        updatedAt: new Date(),
      },
    });
  }

  private async handleSubscriptionCancelled(subEntity: any) {
    const subId = subEntity.id;
    this.logger.warn(`Subscription Cancelled: ${subId}`);

    await this.prisma.tenantSubscription.updateMany({
      where: { providerSubscriptionId: subId },
      data: {
        autopayStatus: AutopayStatus.CANCELLED,
        status: SubscriptionStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });
  }

  private async handlePaymentFailed(payment: any) {
    this.logger.warn(`Payment Failed key: ${payment.id}`);
    
    // Attempt internal cleanup
    const internalPayment = await this.prisma.payment.findFirst({
        where: { providerPaymentId: payment.id }
    });

    if (internalPayment) {
        await this.prisma.payment.update({
            where: { id: internalPayment.id },
            data: { status: 'FAILED' }
        });
    }
  }
}
