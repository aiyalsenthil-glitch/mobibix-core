import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { Logger } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions/subscriptions.service';
import { InvoiceService } from './invoices/invoice.service';
import { EmailService } from '../../common/email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubscriptionStatus,
  PaymentStatus,
  AutopayStatus,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('REMOVED_PAYMENT_INFRA-webhooks')
export class RazorpayWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(RazorpayWebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly invoiceService: InvoiceService,
    private readonly emailService: EmailService,
    @InjectMetric('webhooks_processed_total')
    private readonly webhooksProcessedCounter: Counter<string>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { event, eventId, payload } = job.data;
    const startTime = performance.now();

    // Structured log entry
    const logData: any = {
      event,
      eventId,
      processor: 'RazorpayWebhookProcessor',
      status: 'STARTED',
    };

    this.logger.log(JSON.stringify(logData));

    try {
      switch (event) {
        // ──────────────────────────────────────────────
        // 1. MANUAL PAYMENT SUCCESS
        // ──────────────────────────────────────────────
        case 'payment.captured':
          await this.handlePaymentCaptured(payload.payment.entity);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(payload.payment.entity);
          break;

        // ──────────────────────────────────────────────
        // 2. AUTOPAY EVENTS
        // ──────────────────────────────────────────────
        case 'subscription.activated':
          await this.handleSubscriptionActivated(payload.subscription.entity);
          break;

        case 'subscription.charged':
          await this.handleSubscriptionCharged(
            payload.subscription.entity,
            payload.payment.entity,
          );
          break;

        case 'subscription.halted':
          await this.handleSubscriptionHalted(payload.subscription.entity);
          break;

        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(payload.subscription.entity);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event}`);
      }

      // Mark webhook as processed
      if (eventId) {
        await this.prisma.webhookEvent
          .updateMany({
            where: { provider: 'RAZORPAY', referenceId: eventId },
            data: { status: 'SUCCESS', processedAt: new Date() },
          })
          .catch((err) =>
            this.logger.error(
              JSON.stringify({
                ...logData,
                status: 'DB_UPDATE_FAILED',
                error: err.message,
              }),
            ),
          );
      }

      this.webhooksProcessedCounter.inc({ event });

      const durationMs = Math.round(performance.now() - startTime);
      this.logger.log(
        JSON.stringify({ ...logData, status: 'COMPLETED', durationMs }),
      );
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      this.logger.error(
        JSON.stringify({
          ...logData,
          status: 'FAILED',
          durationMs,
          error: err.message,
        }),
        err?.stack,
      );

      if (eventId) {
        await this.prisma.webhookEvent
          .updateMany({
            where: { provider: 'RAZORPAY', referenceId: eventId },
            data: { status: 'FAILED', error: err.message },
          })
          .catch((updateErr) =>
            this.logger.error('Failed to log error status', updateErr),
          );
      }

      throw err; // allow BullMQ to retry if configured
    }
  }

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  private async handlePaymentCaptured(payment: any) {
    this.logger.log(
      `Payment Captured: ${payment.id} for ₹${payment.amount / 100}`,
    );

    const paymentLinkId = payment.payment_link_id;

    const internalPayment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: payment.id },
      include: { tenant: true },
    });

    if (internalPayment) {
      const receivedAmount = payment.amount / 100;

      if (
        receivedAmount !== internalPayment.amount ||
        payment.currency !== internalPayment.currency ||
        payment.status !== 'captured'
      ) {
        this.logger.error(
          `[FRAUD ALERT] Payment tampering detected! ID: ${internalPayment.id}`,
        );
        throw new Error('Payment mismatch: Fraud Validation Triggered');
      }

      const activeSub = await this.prisma.tenantSubscription.findFirst({
        where: {
          tenantId: internalPayment.tenantId,
          planId: internalPayment.planId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activeSub) {
        const endDate = this.subscriptionsService['calculateEndDate'](
          new Date(),
          activeSub.billingCycle || 'MONTHLY',
        );

        await this.prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: internalPayment.id },
            data: { status: 'SUCCESS' },
          });

          await tx.tenantSubscription.update({
            where: { id: activeSub.id },
            data: {
              status: SubscriptionStatus.ACTIVE,
              paymentStatus: PaymentStatus.SUCCESS,
              updatedAt: new Date(),
              startDate: new Date(),
              endDate: endDate,
            },
          });

          this.eventEmitter.emit('subscription.active', {
            tenantId: internalPayment.tenantId,
            module: activeSub.module,
            planId: activeSub.planId,
            expiryDate: endDate,
          });
        });
        this.logger.log(
          `✅ TenantSubscription ${activeSub.id} activated (Manual).`,
        );
      } else {
        await this.prisma.payment.update({
          where: { id: internalPayment.id },
          data: { status: 'SUCCESS' },
        });
      }

      // Generate Invoice
      try {
        await this.invoiceService.createInvoiceForPayment(internalPayment.id);
      } catch (invErr) {
        this.logger.error(
          `Failed to generate invoice for payment ${internalPayment.id}`,
          invErr,
        );
      }

      // Trigger Cache Refresh
      try {
        await this.eventEmitter.emitAsync('payment.webhook.success', {
          paymentId: internalPayment.id,
        });
      } catch (evtErr) {
        this.logger.error(
          `Failed to emit payment.webhook.success for ${internalPayment.id}`,
          evtErr,
        );
      }
    } else if (paymentLinkId) {
      const subscription = await this.prisma.tenantSubscription.findFirst({
        where: { providerPaymentLinkId: paymentLinkId },
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

        this.eventEmitter.emit('subscription.active', {
          tenantId: subscription.tenantId,
          module: subscription.module,
          planId: subscription.planId,
          expiryDate: subscription.endDate,
        });
        this.logger.log(
          `✅ TenantSubscription ${subscription.id} activated (PaymentLink).`,
        );
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
          startDate: subEntity.current_start
            ? new Date(subEntity.current_start * 1000)
            : undefined,
          endDate: subEntity.current_end
            ? new Date(subEntity.current_end * 1000)
            : undefined,
          updatedAt: new Date(),
        },
      });

      this.eventEmitter.emit('subscription.active', {
        tenantId: subscription.tenantId,
        module: subscription.module,
        planId: subscription.planId,
        expiryDate: subEntity.current_end
          ? new Date(subEntity.current_end * 1000)
          : undefined,
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
      orderBy: { createdAt: 'desc' },
    });

    if (subscription) {
      try {
        await this.subscriptionsService.renewSubscription(subscription.id);
        this.logger.log(
          `✅ TenantSubscription ${subscription.id} renewed (AutoPay webhook ledger action).`,
        );

        const latestSub = await this.prisma.tenantSubscription.findFirst({
          where: {
            tenantId: subscription.tenantId,
            module: subscription.module,
            status: 'ACTIVE',
          },
          orderBy: { createdAt: 'desc' },
        });

        if (latestSub && latestSub.id !== subscription.id) {
          await this.prisma.tenantSubscription.update({
            where: { id: latestSub.id },
            data: {
              providerSubscriptionId: subscription.providerSubscriptionId,
              autopayStatus: AutopayStatus.ACTIVE,
              paymentStatus: PaymentStatus.SUCCESS,
            },
          });
        }

        let internalPayment = await this.prisma.payment.findFirst({
          where: { providerPaymentId: paymentEntity.id },
        });

        if (!internalPayment) {
          internalPayment = await this.prisma.payment.create({
            data: {
              tenantId: latestSub?.tenantId || subscription.tenantId,
              planId: latestSub?.planId || subscription.planId,
              billingCycle:
                latestSub?.billingCycle ||
                subscription.billingCycle ||
                'MONTHLY',
              priceSnapshot:
                latestSub?.priceSnapshot ||
                paymentEntity.base_amount ||
                paymentEntity.amount,
              amount: paymentEntity.amount,
              currency: paymentEntity.currency || 'INR',
              status: 'SUCCESS',
              provider: 'RAZORPAY',
              providerOrderId:
                paymentEntity.order_id || `autopay_${Date.now()}`,
              providerPaymentId: paymentEntity.id,
            },
          });
        }

        try {
          await this.invoiceService.createInvoiceForPayment(internalPayment.id);
          this.logger.log(
            `✅ Invoice generated for AutoPay payment ${internalPayment.id}`,
          );
        } catch (invErr) {
          this.logger.error(
            `Failed to generate invoice for AutoPay payment ${internalPayment.id}`,
            invErr,
          );
        }

        // Trigger Cache Refresh
        try {
          await this.eventEmitter.emitAsync('payment.webhook.success', {
            paymentId: internalPayment.id,
          });
        } catch (evtErr) {
          this.logger.error(
            `Failed to emit payment.webhook.success for ${internalPayment.id}`,
            evtErr,
          );
        }
      } catch (renewalErr) {
        this.logger.error(
          `Sub renewal failed for ${subscription.id} via webhook`,
          renewalErr,
        );
      }
    }
  }

  private async handleSubscriptionHalted(subEntity: any) {
    const subId = subEntity.id;
    this.logger.warn(`Subscription Halted: ${subId}`);

    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: { providerSubscriptionId: subId },
      include: { tenant: true },
    });

    if (subscription) {
      await this.prisma.tenantSubscription.update({
        where: { id: subscription.id },
        data: {
          autopayStatus: AutopayStatus.HALTED,
          paymentStatus: PaymentStatus.FAILED,
          updatedAt: new Date(),
        },
      });

      this.eventEmitter.emit('subscription.suspended', {
        tenantId: subscription.tenantId,
        module: subscription.module,
        reason: 'PAYMENT_HALTED',
      });

      if (subscription.tenant?.contactEmail) {
        await this.emailService.send({
          tenantId: subscription.tenantId,
          recipientType: 'TENANT',
          emailType: 'SUBSCRIPTION_HALTED',
          referenceId: subscription.id,
          module: subscription.module,
          to: subscription.tenant.contactEmail,
          subject: 'Action Required: Your subscription has been suspended',
          data: {
            name: subscription.tenant.name,
            billingLink: `https://${subscription.module === 'MOBILE_SHOP' ? 'app.REMOVED_DOMAIN' : 'mobibix.in'}/billing`,
          },
        });
      }
    }
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

    const internalPayment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: payment.id },
      include: { tenant: true },
    });

    if (internalPayment) {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: internalPayment.id },
          data: { status: 'FAILED' },
        });

        const activeSub = await tx.tenantSubscription.findFirst({
          where: {
            tenantId: internalPayment.tenantId,
            planId: internalPayment.planId,
            status: { in: ['ACTIVE', 'PENDING'] },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (activeSub) {
          await tx.tenantSubscription.update({
            where: { id: activeSub.id },
            data: {
              paymentStatus: PaymentStatus.FAILED,
              status: SubscriptionStatus.PAST_DUE,
              updatedAt: new Date(),
            },
          });

          this.eventEmitter.emit('subscription.suspended', {
            tenantId: internalPayment.tenantId,
            module: activeSub.module,
            reason: 'PAYMENT_FAILED_PAST_DUE',
          });
          this.logger.warn(
            `⚠️ Subscription ${activeSub.id} moved to PAST_DUE ` +
              `(tenant: ${internalPayment.tenant?.name})`,
          );

          if (internalPayment.tenant?.contactEmail) {
            await this.emailService.send({
              tenantId: internalPayment.tenantId,
              recipientType: 'TENANT',
              emailType: 'PAYMENT_FAILED',
              referenceId: internalPayment.id,
              module: activeSub.module,
              to: internalPayment.tenant.contactEmail,
              subject: 'Payment Failed',
              data: {
                tenantName: internalPayment.tenant.name,
                planName: activeSub.planId,
                retryCount: 1,
                payLink: `https://${activeSub.module === 'MOBILE_SHOP' ? 'app.REMOVED_DOMAIN' : 'mobibix.in'}/billing`,
              },
            });
          }
        }
      });
    }
  }
}
