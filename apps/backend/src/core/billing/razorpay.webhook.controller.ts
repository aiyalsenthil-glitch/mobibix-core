import {
  Controller,
  Post,
  Headers,
  Body,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RazorpayService } from './REMOVED_PAYMENT_INFRA.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
<<<<<<< HEAD
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
=======
import {
  SubscriptionStatus,
  PaymentStatus,
  AutopayStatus,
  BillingType,
} from '@prisma/client';

import { SubscriptionsService } from './subscriptions/subscriptions.service';
import { InvoiceService } from './invoices/invoice.service';
import { EmailService } from '../../common/email/email.service';
>>>>>>> 7cb0ea1ca96e8d3428e9661c000a44e63fa4e61f

@Controller('billing/webhook/REMOVED_PAYMENT_INFRA')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly REMOVED_PAYMENT_INFRAService: RazorpayService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
<<<<<<< HEAD
    @InjectQueue('REMOVED_PAYMENT_INFRA-webhooks') private readonly webhookQueue: Queue,
=======
    private readonly subscriptionsService: SubscriptionsService,
    private readonly invoiceService: InvoiceService,
    private readonly emailService: EmailService,
>>>>>>> 7cb0ea1ca96e8d3428e9661c000a44e63fa4e61f
  ) {}

  @Post()
  async handleWebhook(
    @Headers('x-REMOVED_PAYMENT_INFRA-signature') signature: string,
    @Body() body: any,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      throw new BadRequestException('Webhook configuration error');
    }

    if (
      !this.REMOVED_PAYMENT_INFRAService.validateWebhookSignature(req.rawBody ?? Buffer.from(JSON.stringify(body)), signature, secret)
    ) {
      this.logger.warn('Invalid Razorpay Webhook Signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = body.event;
    const eventId = body.headers?.['x-REMOVED_PAYMENT_INFRA-event-id'] || body.id;

    this.logger.log(`Received Razorpay Webhook: ${event} [${eventId}]`);

    if (!eventId) {
      this.logger.warn(`Webhook missing event ID, falling back to direct push...`);
    } else {
      try {
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
        this.logger.error(`Failed to lock webhook event ${eventId}`, err);
      }
    }

    try {
      // Pass the job to BullMQ
      await this.webhookQueue.add('process-webhook', {
        event,
        eventId,
        payload: body.payload,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      });

      this.logger.log(`Enqueued webhook event ${eventId} to BullMQ.`);
    } catch (err: any) {
      this.logger.error(`Failed to enqueue webhook ${eventId}`, err);
      
      if (eventId) {
        await this.prisma.webhookEvent.updateMany({
          where: { provider: 'RAZORPAY', referenceId: eventId },
          data: { status: 'FAILED', error: err.message },
        }).catch(err => this.logger.error('Failed to log error status', err));
      }

      return { status: 'error', message: err.message };
    }

    return { status: 'ok' };
  }
<<<<<<< HEAD
=======

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
             const endDate = this.subscriptionsService.calculateEndDate(new Date(), activeSub.billingCycle || 'MONTHLY');
             
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

    const subscription = await this.prisma.tenantSubscription.findFirst({
        where: { providerSubscriptionId: subId },
        include: { tenant: true }
    });

    if (subscription) {
      await this.prisma.tenantSubscription.update({
        where: { id: subscription.id },
        data: {
          autopayStatus: AutopayStatus.HALTED,
          paymentStatus: PaymentStatus.FAILED, // Usually implies payment failure
          updatedAt: new Date(),
        },
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
          }
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
    
    // Attempt internal cleanup
    const internalPayment = await this.prisma.payment.findFirst({
        where: { providerPaymentId: payment.id },
        include: { tenant: true }
    });

    if (internalPayment) {
        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: internalPayment.id },
                data: { status: 'FAILED' }
            });

            const activeSub = await tx.tenantSubscription.findFirst({
                where: {
                    tenantId: internalPayment.tenantId,
                    planId: internalPayment.planId,
                    status: { in: ['ACTIVE', 'PENDING'] }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (activeSub) {
                await tx.tenantSubscription.update({
                    where: { id: activeSub.id },
                    data: {
                        paymentStatus: PaymentStatus.FAILED,
                        status: SubscriptionStatus.PAST_DUE,
                        updatedAt: new Date(),
                    }
                });
                this.logger.warn(
                    `⚠️ Subscription ${activeSub.id} moved to PAST_DUE ` +
                    `(tenant: ${internalPayment.tenant?.name})`
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
                            planName: activeSub.planId, // Simplified for now
                            retryCount: 1,
                            payLink: `https://${activeSub.module === 'MOBILE_SHOP' ? 'app.REMOVED_DOMAIN' : 'mobibix.in'}/billing`,
                        }
                    });
                }
            }
        });
    }
  }
>>>>>>> 7cb0ea1ca96e8d3428e9661c000a44e63fa4e61f
}
