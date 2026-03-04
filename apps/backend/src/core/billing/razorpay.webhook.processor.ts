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

        case 'payment.refunded':
          await this.handlePaymentRefunded(payload.payment.entity, payload.refund?.entity);
          break;

        case 'payment.dispute.created':
          await this.handlePaymentDisputeCreated(payload.dispute.entity, payload.payment.entity);
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

          await tx.billingEventLog.create({
            data: {
              tenantId: internalPayment.tenantId,
              eventType: 'payment.captured.activated',
              providerReferenceId: payment.id,
              statusBefore: 'PENDING',
              statusAfter: 'ACTIVE',
            },
          });
        });

        this.eventEmitter.emit('subscription.active', {
          tenantId: internalPayment.tenantId,
          module: activeSub.module,
          planId: activeSub.planId,
          expiryDate: endDate,
        });

        this.logger.log(
          `✅ TenantSubscription ${activeSub.id} activated (Manual).`,
        );

        // Generate Invoice (Outside transaction)
        try {
          await this.invoiceService.createInvoiceForPayment(internalPayment.id);
        } catch (invErr) {
          this.logger.error(
            `Failed to generate invoice for payment ${internalPayment.id}`,
            invErr,
          );
        }
      } else {
        await this.prisma.payment.update({
          where: { id: internalPayment.id },
          data: { status: 'SUCCESS' },
        });
      }

      // Trigger Cache Refresh (Outside transaction)
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

        await this.prisma.billingEventLog.create({
          data: {
            tenantId: subscription.tenantId,
            eventType: 'payment.captured.link_activated',
            providerReferenceId: payment.id,
            statusAfter: 'ACTIVE',
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
      await this.prisma.$transaction(async (tx) => {
        await tx.tenantSubscription.update({
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

        await tx.billingEventLog.create({
          data: {
            tenantId: subscription.tenantId,
            eventType: 'subscription.activated',
            providerReferenceId: subId,
            statusBefore: 'PENDING',
            statusAfter: 'ACTIVE',
          },
        });
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
      // ─────────────────────────────────────────────────────────────────────
      // FIX 2A: EXPIRED Resurrection Guard
      // A delayed webhook can arrive after the 1 AM cron has already expired
      // the subscription. If autopay was still active on Razorpay and the
      // charge is legitimate, we treat this as a resurrection and proceed.
      // Any other non-ACTIVE status (e.g. CANCELLED) is non-retriable — skip.
      // ─────────────────────────────────────────────────────────────────────
      if (subscription.status !== 'ACTIVE') {
        if (
          subscription.status === 'EXPIRED' &&
          subscription.autopayStatus === AutopayStatus.ACTIVE
        ) {
          this.logger.warn(
            `[RESURRECTION] subscription.charged arrived after cron expiry for sub ` +
            `${subscription.id} (tenant: ${subscription.tenantId}). ` +
            `Autopay charge is legitimate — proceeding with renewal.`,
          );
          // Fall through to the renewal transaction below.
        } else {
          // Deterministically non-renewable (CANCELLED, DISPUTED, etc). Do NOT retry.
          this.logger.warn(
            `[SKIP] subscription.charged for sub ${subscription.id} which is ` +
            `${subscription.status}. Not eligible for renewal. Ignoring.`,
          );
          return;
        }
      }

      try {
        // Atomic renewal and payment recording
        const { internalPaymentId } = await this.prisma.$transaction(async (tx) => {
          // 1. Process local renewal
          // Note: SubscriptionsService.renewSubscription isn't using transaction internally, 
          // so we'll have to either pass tx or implement a simplified version here.
          // For now, let's stick to consistent status updates within this transaction.
          
          const now = new Date();
          
          // Re-implementing a simplified atomic version of 'renewSubscription' logic here 
          // to ensure transaction integrity if we don't refactor the service yet.
          const nextPlanId = subscription.nextPlanId || subscription.planId;
          const nextBillingCycle = subscription.nextBillingCycle || subscription.billingCycle || 'MONTHLY';
          const nextPriceSnapshot = subscription.nextPriceSnapshot ?? subscription.priceSnapshot;

          const newEndDate = this.subscriptionsService['calculateEndDate'](now, nextBillingCycle);

          const renewed = await tx.tenantSubscription.update({
            where: { id: subscription.id },
            data: {
              planId: nextPlanId,
              status: SubscriptionStatus.ACTIVE,
              startDate: now,
              endDate: newEndDate,
              billingCycle: nextBillingCycle as any,
              priceSnapshot: nextPriceSnapshot,
              autoRenew: true,
              autopayStatus: AutopayStatus.ACTIVE,
              paymentStatus: PaymentStatus.SUCCESS,
              lastRenewedAt: now,
              updatedAt: now,
            },
          });

          // 2. Map Payment
          let internalPayment = await tx.payment.findFirst({
            where: { providerPaymentId: paymentEntity.id },
          });

          if (!internalPayment) {
            internalPayment = await tx.payment.create({
              data: {
                tenantId: subscription.tenantId,
                planId: nextPlanId,
                billingCycle: nextBillingCycle,
                priceSnapshot: nextPriceSnapshot || paymentEntity.amount,
                amount: paymentEntity.amount,
                currency: paymentEntity.currency || 'INR',
                status: 'SUCCESS',
                provider: 'RAZORPAY',
                providerOrderId: paymentEntity.order_id || `autopay_${Date.now()}`,
                providerPaymentId: paymentEntity.id,
              },
            });
          }

          // 3. Log Event
          await tx.billingEventLog.create({
            data: {
              tenantId: subscription.tenantId,
              eventType: 'subscription.charged.renewed',
              providerReferenceId: paymentEntity.id,
              statusBefore: 'ACTIVE',
              statusAfter: 'ACTIVE',
            },
          });

          return { internalPaymentId: internalPayment.id, renewedSub: renewed };
        });

        this.logger.log(`✅ TenantSubscription renewed & payment recorded atomically.`);

        // Post-Transaction: Async tasks
        try {
          await this.invoiceService.createInvoiceForPayment(internalPaymentId);
        } catch (invErr) {
          this.logger.error(`Failed to generate invoice for AutoPay payment ${internalPaymentId}`, invErr);
        }

        try {
          await this.eventEmitter.emitAsync('payment.webhook.success', { paymentId: internalPaymentId });
        } catch (evtErr) {
          this.logger.error(`Failed to emit payment.webhook.success for ${internalPaymentId}`, evtErr);
        }

      } catch (renewalErr) {
        this.logger.error(
          `Sub renewal failed for ${subscription.id} via webhook`,
          renewalErr,
        );
        // FIX 2B: Re-throw so BullMQ can retry transient failures (DB, network).
        // The EXPIRED resurrection guard and SKIP guard above ensure that
        // retries only happen for genuinely retriable scenarios.
        throw renewalErr;
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
      // FIX 1: Wrap in $transaction and set status → PAST_DUE so the
      // TenantStatusGuard enforces read-only mode during the retry window.
      // Without PAST_DUE, guard's isPastDue check is never true and the
      // tenant retains full write access despite a failed autopay charge.
      await this.prisma.$transaction(async (tx) => {
        await tx.tenantSubscription.update({
          where: { id: subscription.id },
          data: {
            autopayStatus: AutopayStatus.HALTED,
            paymentStatus: PaymentStatus.FAILED,
            status: SubscriptionStatus.PAST_DUE, // ← FIX: was missing — guard depends on this
            updatedAt: new Date(),
          },
        });

        await tx.billingEventLog.create({
          data: {
            tenantId: subscription.tenantId,
            eventType: 'subscription.halted',
            providerReferenceId: subId,
            statusBefore: subscription.status,
            statusAfter: 'PAST_DUE',
          },
        });
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

    // FIX 1b: Three improvements over the original:
    //  1. Filter status: { not: 'EXPIRED' } — avoids touching historical rows
    //     from prior billing cycles that share the same providerSubscriptionId.
    //  2. Set autoRenew: false — aligns the DB flag with the actual state.
    //  3. Add BillingEventLog — cancellations were the only major billing event
    //     without an audit trail entry.
    const affected = await this.prisma.tenantSubscription.updateMany({
      where: {
        providerSubscriptionId: subId,
        status: { not: SubscriptionStatus.EXPIRED }, // skip historical EXPIRED rows
      },
      data: {
        autopayStatus: AutopayStatus.CANCELLED,
        status: SubscriptionStatus.CANCELLED,
        autoRenew: false, // ← FIX: was left as true — misleading flag
        updatedAt: new Date(),
      },
    });

    this.logger.warn(
      `Subscription cancelled: ${affected.count} active row(s) updated for providerSubId ${subId}.`,
    );

    // Audit log (best-effort — don't block on failure)
    await this.prisma.billingEventLog
      .create({
        data: {
          // tenantId resolved via the first matched subscription for the log
          tenantId: (
            await this.prisma.tenantSubscription.findFirst({
              where: { providerSubscriptionId: subId },
              select: { tenantId: true },
            })
          )?.tenantId ?? 'unknown',
          eventType: 'subscription.cancelled',
          providerReferenceId: subId,
          statusBefore: 'ACTIVE',
          statusAfter: 'CANCELLED',
        },
      })
      .catch((err) =>
        this.logger.error(
          `Failed to write BillingEventLog for cancellation of ${subId}`,
          err,
        ),
      );
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

  private async handlePaymentRefunded(payment: any, refund: any) {
    this.logger.warn(`Payment Refunded: ${payment.id}, Refund: ${refund?.id}`);

    const internalPayment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: payment.id },
      include: { tenant: true },
    });

    if (!internalPayment) {
      this.logger.error(`Internal payment record not found for refund: ${payment.id}`);
      return;
    }

    const isFullRefund = refund
      ? refund.amount === payment.amount
      : payment.amount_refunded === payment.amount;

    await this.prisma.$transaction(async (tx) => {
      // Update Payment Record
      await tx.payment.update({
        where: { id: internalPayment.id },
        data: { status: 'REFUNDED' },
      });

      // Log Event
      await tx.billingEventLog.create({
        data: {
          tenantId: internalPayment.tenantId,
          eventType: isFullRefund ? 'payment.refund.full' : 'payment.refund.partial',
          providerReferenceId: refund?.id || payment.id,
          statusBefore: 'SUCCESS',
          statusAfter: 'REFUNDED',
        },
      });

      // Scenario A & B: Full Refund -> Immediate Cancellation
      if (isFullRefund) {
        const activeSub = await tx.tenantSubscription.findFirst({
          where: {
            tenantId: internalPayment.tenantId,
            module: internalPayment.module,
            status: { in: ['ACTIVE', 'PAST_DUE'] },
          },
        });

        if (activeSub) {
          await tx.tenantSubscription.update({
            where: { id: activeSub.id },
            data: {
              status: SubscriptionStatus.CANCELLED,
              updatedAt: new Date(),
            },
          });

          this.logger.log(`Subscription ${activeSub.id} cancelled due to full refund.`);
        }
      }
    });

    // Post-Transaction: Handle External Subscription Cancellation for Autopay
    const activeSub = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId: internalPayment.tenantId,
        status: 'CANCELLED',
        providerSubscriptionId: { not: null },
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (activeSub?.providerSubscriptionId && isFullRefund) {
      try {
        await this.subscriptionsService.toggleAutoRenew(activeSub.id, false);
        this.logger.log(`External mandate cancelled for refunded sub ${activeSub.id}`);
      } catch (err) {
        this.logger.error(`Failed to cancel external mandate after refund for sub ${activeSub.id}`, err);
      }
    }
  }

  private async handlePaymentDisputeCreated(dispute: any, payment: any) {
    this.logger.warn(`Dispute Created: ${dispute.id} for Payment: ${payment.id}`);

    const internalPayment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: payment.id },
      include: { tenant: true },
    });

    if (!internalPayment) {
      this.logger.error(`Internal payment record not found for dispute: ${payment.id}`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Update Statuses
      await tx.payment.update({
        where: { id: internalPayment.id },
        data: { status: 'DISPUTED' },
      });

      const activeSub = await tx.tenantSubscription.findFirst({
        where: {
          tenantId: internalPayment.tenantId,
          module: internalPayment.module,
          status: 'ACTIVE',
        },
      });

      if (activeSub) {
        await tx.tenantSubscription.update({
          where: { id: activeSub.id },
          data: {
            status: SubscriptionStatus.DISPUTED,
            updatedAt: new Date(),
          },
        });
      }

      await tx.billingEventLog.create({
        data: {
          tenantId: internalPayment.tenantId,
          eventType: 'payment.dispute.created',
          providerReferenceId: dispute.id,
          statusBefore: 'ACTIVE',
          statusAfter: 'DISPUTED',
        },
      });
    });

    this.logger.warn(`Access suspended for tenant ${internalPayment.tenantId} due to dispute.`);
  }
}
