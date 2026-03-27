import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as Sentry from '@sentry/node';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { Logger } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions/subscriptions.service';
import { PaymentActivationService } from './payments/payment-activation.service';
import { InvoiceService } from './invoices/invoice.service';
import { EmailService } from '../../common/email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubscriptionStatus,
  PaymentStatus,
  AutopayStatus,
  BillingType,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('REMOVED_PAYMENT_INFRA-webhooks', { 
  concurrency: 2,
  lockDuration: 60000,   // Extend lock to 60s
  stalledInterval: 60000 // Only check stalled jobs every 60s (vs 30s default)
})
export class RazorpayWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(RazorpayWebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly invoiceService: InvoiceService,
    private readonly emailService: EmailService,
    private readonly paymentActivationService: PaymentActivationService,
    @InjectMetric('webhooks_processed_total')
    private readonly webhooksProcessedCounter: Counter<string>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { event, eventId, payload } = job.data;
    return this.processEvent(event, eventId, payload);
  }

  async processEvent(event: string, eventId: string | undefined, payload: any): Promise<void> {
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

        case 'subscription.completed':
          await this.handleSubscriptionCompleted(payload.subscription.entity);
          break;

        case 'subscription.paused':
          await this.handleSubscriptionPaused(payload.subscription.entity);
          break;

        case 'subscription.resumed':
          await this.handleSubscriptionResumed(payload.subscription.entity);
          break;

        case 'payment.refunded':
          await this.handlePaymentRefunded(
            payload.payment.entity,
            payload.refund?.entity,
          );
          break;

        case 'payment.dispute.created':
          await this.handlePaymentDisputeCreated(
            payload.dispute.entity,
            payload.payment.entity,
          );
          break;

        case 'payment.dispute.won':
        case 'payment.dispute.lost':
          await this.handlePaymentDisputeResolved(
            payload.dispute.entity,
            payload.payment.entity,
            event,
          );
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

  @OnWorkerEvent('failed')
  onJobFailed(job: Job, error: Error) {
    const maxAttempts = job.opts?.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        JSON.stringify({
          status: 'DEAD_LETTER',
          jobId: job.id,
          event: job.data?.event,
          eventId: job.data?.eventId,
          attempts: job.attemptsMade,
          error: error.message,
        }),
        error.stack,
      );
      Sentry.captureException(error, {
        tags: {
          component: 'REMOVED_PAYMENT_INFRA-webhook',
          event: job.data?.event,
          eventId: job.data?.eventId,
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  private async handlePaymentCaptured(payment: any) {
    this.logger.log(
      `Payment Captured: ${payment.id} for ₹${payment.amount / 100}`,
    );

    let internalPayment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: payment.id },
    });

    // C-3: Orphan recovery — backend crashed before local Payment record was created.
    // Razorpay notes carry tenantId/planId/module set at payment link creation time.
    if (!internalPayment) {
      const notes = payment.notes || {};
      if (notes.tenantId && notes.planId) {
        // Security: verify the tenantId from notes actually exists before trusting it
        const tenantExists = await this.prisma.tenant.findUnique({
          where: { id: notes.tenantId },
          select: { id: true },
        });
        if (!tenantExists) {
          this.logger.error(
            `[ORPHAN RECOVERY] tenantId "${notes.tenantId}" from notes does not exist in DB. Possible spoofed notes — dropping payment ${payment.id}.`,
          );
          return;
        }

        this.logger.warn(
          `[ORPHAN RECOVERY] No local Payment record for ${payment.id}. Reconstructing from Razorpay notes.`,
        );
        try {
          internalPayment = await this.prisma.payment.create({
            data: {
              tenantId: notes.tenantId,
              planId: notes.planId,
              module: (notes.module || 'MOBILE_SHOP') as any,
              billingCycle: (notes.billingCycle || 'MONTHLY') as any,
              priceSnapshot: payment.amount,
              amount: Math.max(payment.amount || 0, 1),
              currency: payment.currency || 'INR',
              status: 'PENDING',
              provider: 'RAZORPAY',
              providerOrderId: payment.order_id || `orphan_${payment.id}`,
              providerPaymentId: payment.id,
            },
          });
          this.logger.log(
            `[ORPHAN RECOVERY] Created Payment ${internalPayment.id} from notes.`,
          );
        } catch (createErr: any) {
          if (createErr.code === 'P2002') {
            // Race: another worker just created it
            internalPayment = await this.prisma.payment.findFirst({
              where: { providerPaymentId: payment.id },
            });
          } else {
            this.logger.error(
              `[ORPHAN RECOVERY] Failed to reconstruct Payment: ${createErr.message}`,
            );
            return;
          }
        }
      } else {
        this.logger.warn(
          `No local Payment record and no notes for orphan recovery: ${payment.id}`,
        );
        return;
      }
    }

    if (internalPayment) {
      await this.paymentActivationService.activateSubscriptionFromPayment(internalPayment.id);
      this.logger.log(
        `✅ Payment ${internalPayment.id} activated via PaymentActivationService.`,
      );
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
      // Resurrection / Out-of-order Guard
      //
      // EXPIRED + autopayStatus=ACTIVE: delayed webhook after cron expiry —
      //   legitimate charge, resurrect.
      //
      // PAST_DUE + autopayStatus=ACTIVE: user updated card on Razorpay portal,
      //   Razorpay retried and succeeded — legitimate charge, recover. (C-1 fix)
      //
      // PENDING + autopayStatus=null: subscription.charged arrived before
      //   subscription.activated (out-of-order delivery). Treat as first-charge
      //   activation. (H-4 fix)
      //
      // Any other non-ACTIVE status (CANCELLED, DISPUTED, etc.) — non-retriable.
      // ─────────────────────────────────────────────────────────────────────
      // Do not renew if tenant explicitly cancelled auto-renewal
      if (!subscription.autoRenew) {
        this.logger.warn(
          `[SKIP] subscription.charged for sub ${subscription.id} with autoRenew=false. Ignoring renewal.`,
        );
        return;
      }

      if (subscription.status !== 'ACTIVE') {
        if (
          (subscription.status === 'EXPIRED' || subscription.status === 'PAST_DUE') &&
          subscription.autopayStatus === AutopayStatus.ACTIVE
        ) {
          this.logger.warn(
            `[RESURRECTION] subscription.charged on ${subscription.status} sub ` +
              `${subscription.id} — legitimate charge, proceeding with renewal.`,
          );
          // Fall through to the renewal transaction below.
        } else if (
          subscription.status === 'PENDING' &&
          subscription.autopayStatus === null
        ) {
          this.logger.warn(
            `[OUT-OF-ORDER] subscription.charged arrived before subscription.activated ` +
              `for ${subscription.id}. Processing as first-charge activation.`,
          );
          // Fall through — the renewal transaction will handle first cycle creation.
        } else {
          // Deterministically non-renewable (CANCELLED, DISPUTED, etc). Do NOT retry.
          this.logger.warn(
            `[SKIP] subscription.charged for sub ${subscription.id} which is ` +
              `${subscription.status}/${subscription.autopayStatus}. Not eligible for renewal. Ignoring.`,
          );
          return;
        }
      }

      try {
        // Atomic renewal and payment recording
        const { internalPaymentId } = await this.prisma.$transaction(
          async (tx) => {
            // 1. Process local renewal (Create new row for history)
            const rzStart = subEntity.current_start
              ? new Date(subEntity.current_start * 1000)
              : new Date();
            const rzEnd = subEntity.current_end
              ? new Date(subEntity.current_end * 1000)
              : this.subscriptionsService['calculateEndDate'](
                  rzStart,
                  subscription.billingCycle || 'MONTHLY',
                );

            const nextPlanId = subscription.nextPlanId || subscription.planId;
            const nextBillingCycle =
              subscription.nextBillingCycle ||
              subscription.billingCycle ||
              'MONTHLY';
            const nextPriceSnapshot =
              subscription.nextPriceSnapshot ?? subscription.priceSnapshot;

            // Mark current as EXPIRED
            await tx.tenantSubscription.update({
              where: { id: subscription.id },
              data: {
                status: SubscriptionStatus.EXPIRED,
                updatedAt: new Date(),
              },
            });

            // Create new record for the new cycle
            const renewed = await tx.tenantSubscription.create({
              data: {
                tenantId: subscription.tenantId,
                planId: nextPlanId,
                module: subscription.module,
                billingCycle: nextBillingCycle as any,
                priceSnapshot: nextPriceSnapshot,
                autoRenew: subscription.autoRenew,
                status: SubscriptionStatus.ACTIVE,
                paymentStatus: PaymentStatus.SUCCESS,
                autopayStatus: AutopayStatus.ACTIVE,
                startDate: rzStart,
                endDate: rzEnd,
                lastRenewedAt: new Date(),
                providerSubscriptionId: subId,
                billingType: BillingType.AUTOPAY,
                aiTokensUsed: 0,                    // FIX 1: Reset AI quota on AutoPay renewal
                lastQuotaResetAt: new Date(),        // FIX 1
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
                  module: subscription.module,
                  billingCycle: nextBillingCycle,
                  priceSnapshot: nextPriceSnapshot || paymentEntity.amount,
                  amount: Math.max(paymentEntity.amount || 0, 1),
                  currency: paymentEntity.currency || 'INR',
                  status: 'SUCCESS',
                  provider: 'RAZORPAY',
                  providerOrderId:
                    paymentEntity.order_id || `autopay_${Date.now()}`,
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
                statusBefore: subscription.status,
                statusAfter: 'ACTIVE',
              },
            });

            return {
              internalPaymentId: internalPayment.id,
              renewedSub: renewed,
            };
          },
        );

        this.logger.log(
          `✅ TenantSubscription renewed & payment recorded atomically.`,
        );

        // Post-Transaction: Async tasks
        try {
          await this.invoiceService.createInvoiceForPayment(internalPaymentId);
        } catch (invErr) {
          this.logger.error(
            `Failed to generate invoice for AutoPay payment ${internalPaymentId}`,
            invErr,
          );
        }

        try {
          await this.eventEmitter.emitAsync('payment.webhook.success', {
            paymentId: internalPaymentId,
          });
        } catch (evtErr) {
          this.logger.error(
            `Failed to emit payment.webhook.success for ${internalPaymentId}`,
            evtErr,
          );
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
            billingLink: `https://${subscription.module === 'MOBILE_SHOP' ? 'REMOVED_DOMAIN' : 'mobibix.in'}/billing`,
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
    const logSub = await this.prisma.tenantSubscription.findFirst({
      where: { providerSubscriptionId: subId },
      select: { tenantId: true },
    });

    if (logSub?.tenantId) {
      await this.prisma.billingEventLog
        .create({
          data: {
            tenantId: logSub.tenantId,
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
  }

  private async handleSubscriptionCompleted(subEntity: any) {
    const subId = subEntity.id;
    this.logger.warn(`Subscription Completed (total_count exhausted): ${subId}`);

    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: {
        providerSubscriptionId: subId,
        status: { not: SubscriptionStatus.EXPIRED },
      },
    });

    if (!subscription) return;

    await this.prisma.tenantSubscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.EXPIRED,
        autoRenew: false,
        autopayStatus: AutopayStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });

    this.eventEmitter.emit('subscription.expired', {
      tenantId: subscription.tenantId,
      module: subscription.module,
    });

    this.logger.log(`Subscription ${subscription.id} marked EXPIRED (completed).`);
  }

  private async handleSubscriptionPaused(subEntity: any) {
    this.logger.warn(`Subscription Paused by Razorpay: ${subEntity.id}`);

    // H-6: Fetch tenantId from DB — subEntity is a Razorpay API object and has no tenantId field.
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: {
        providerSubscriptionId: subEntity.id,
        status: { not: SubscriptionStatus.EXPIRED },
      },
      select: { tenantId: true, module: true },
    });

    await this.prisma.tenantSubscription.updateMany({
      where: {
        providerSubscriptionId: subEntity.id,
        status: { not: SubscriptionStatus.EXPIRED },
      },
      data: {
        autopayStatus: AutopayStatus.HALTED,
        status: SubscriptionStatus.PAST_DUE,
        updatedAt: new Date(),
      },
    });

    if (sub) {
      this.eventEmitter.emit('subscription.suspended', {
        tenantId: sub.tenantId,
        module: sub.module,
        reason: 'RAZORPAY_PAUSED',
      });
    }
  }

  private async handleSubscriptionResumed(subEntity: any) {
    this.logger.log(`Subscription Resumed: ${subEntity.id}`);
    await this.prisma.tenantSubscription.updateMany({
      where: {
        providerSubscriptionId: subEntity.id,
        status: { not: SubscriptionStatus.EXPIRED },
      },
      data: {
        autopayStatus: AutopayStatus.ACTIVE,
        status: SubscriptionStatus.ACTIVE,
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

        // FIX 3: Row-level lock before state transition to prevent concurrent webhook race condition.
        // Two simultaneous payment.failed webhooks for the same tenant would otherwise both read
        // ACTIVE, both try to set PAST_DUE, and the second would be a no-op at best or cause
        // inconsistent audit logs at worst.
        await tx.$executeRaw`
          SELECT id FROM "TenantSubscription"
          WHERE "tenantId" = ${internalPayment.tenantId}
            AND "planId" = ${internalPayment.planId}
            AND status IN ('ACTIVE', 'PENDING')
          FOR UPDATE
        `;

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
                payLink: `https://${activeSub.module === 'MOBILE_SHOP' ? 'REMOVED_DOMAIN' : 'mobibix.in'}/billing`,
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
      this.logger.error(
        `Internal payment record not found for refund: ${payment.id}`,
      );
      return;
    }

    // 🚩 DOUBLE REFUND / CHARGEBACK PROTECTION
    if (internalPayment.status === 'DISPUTED') {
      this.logger.error(
        `🚨 CRITICAL: Refund received for DISPUTED payment ${internalPayment.id}. This may indicate a double refund risk! Check Razorpay dashboard.`,
      );
      await this.prisma.billingEventLog
        .create({
          data: {
            tenantId: internalPayment.tenantId,
            eventType: 'payment.refund_dispute_collision',
            providerReferenceId: refund?.id || payment.id,
            statusBefore: 'DISPUTED',
            statusAfter: 'REFUNDED',
          },
        })
        .catch((err) =>
          this.logger.error('Failed to log refund collision', err),
        );
    }

    // Double Refund / Chargeback Guard
    if (
      internalPayment.status === 'DISPUTED' ||
      internalPayment.status === 'CHARGEBACK'
    ) {
      this.logger.error(
        `Blocked refund for payment ${payment.id} because status is ${internalPayment.status}. Prevents double loss.`,
      );
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
          eventType: isFullRefund
            ? 'payment.refund.full'
            : 'payment.refund.partial',
          providerReferenceId: refund?.id || payment.id,
          statusBefore: 'SUCCESS',
          statusAfter: 'REFUNDED',
        },
      });

      const activeSub = await tx.tenantSubscription.findFirst({
        where: {
          tenantId: internalPayment.tenantId,
          module: internalPayment.module,
          status: { in: ['ACTIVE', 'PAST_DUE'] },
        },
      });

      if (activeSub) {
        if (isFullRefund) {
          // Full refund → immediate cancellation
          await tx.tenantSubscription.update({
            where: { id: activeSub.id },
            data: { status: SubscriptionStatus.CANCELLED, updatedAt: new Date() },
          });
          this.logger.log(`Subscription ${activeSub.id} cancelled due to full refund.`);
        } else if (activeSub.status === 'ACTIVE') {
          // Partial refund → PAST_DUE for human review; access limited to read-only
          await tx.tenantSubscription.update({
            where: { id: activeSub.id },
            data: { status: SubscriptionStatus.PAST_DUE, updatedAt: new Date() },
          });
          this.logger.warn(`Subscription ${activeSub.id} set to PAST_DUE due to partial refund.`);
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
      orderBy: { updatedAt: 'desc' },
    });

    if (activeSub?.providerSubscriptionId && isFullRefund) {
      try {
        await this.subscriptionsService.toggleAutoRenew(activeSub.id, false);
        this.logger.log(
          `External mandate cancelled for refunded sub ${activeSub.id}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to cancel external mandate after refund for sub ${activeSub.id}`,
          err,
        );
      }
    }
  }

  private async handlePaymentDisputeCreated(dispute: any, payment: any) {
    this.logger.warn(
      `Dispute Created: ${dispute.id} for Payment: ${payment.id}`,
    );

    const internalPayment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: payment.id },
      include: { tenant: true },
    });

    if (!internalPayment) {
      this.logger.error(
        `Internal payment record not found for dispute: ${payment.id}`,
      );
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

    this.logger.warn(
      `Access suspended for tenant ${internalPayment.tenantId} due to dispute.`,
    );
  }

  private async handlePaymentDisputeResolved(
    dispute: any,
    payment: any,
    event: string,
  ) {
    const internalPayment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: payment.id },
    });

    if (!internalPayment) {
      this.logger.error(
        `Internal payment record not found for dispute resolution: ${payment.id}`,
      );
      return;
    }

    const isWon = event === 'payment.dispute.won';

    await this.prisma.$transaction(async (tx) => {
      // Update Payment Status
      await tx.payment.update({
        where: { id: internalPayment.id },
        data: { status: isWon ? 'SUCCESS' : 'CHARGEBACK' },
      });

      // Update Subscription if needed
      const sub = await tx.tenantSubscription.findFirst({
        where: {
          tenantId: internalPayment.tenantId,
          module: internalPayment.module,
          status: 'DISPUTED',
        },
      });

      if (sub) {
        await tx.tenantSubscription.update({
          where: { id: sub.id },
          data: {
            status: isWon
              ? SubscriptionStatus.ACTIVE
              : SubscriptionStatus.CANCELLED,
            updatedAt: new Date(),
          },
        });
      }

      await tx.billingEventLog.create({
        data: {
          tenantId: internalPayment.tenantId,
          eventType: event,
          providerReferenceId: dispute.id,
          statusBefore: 'DISPUTED',
          statusAfter: isWon ? 'SUCCESS' : 'CHARGEBACK',
        },
      });
    });

    this.logger.log(
      `Dispute ${dispute.id} resolved as ${isWon ? 'WON' : 'LOST'}. Status updated.`,
    );
  }
}
