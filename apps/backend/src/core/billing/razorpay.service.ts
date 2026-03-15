import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'REMOVED_PAYMENT_INFRA';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
  private REMOVED_PAYMENT_INFRA: Razorpay;
  private readonly logger = new Logger(RazorpayService.name);
  private keyId: string;
  private keySecret: string;

  constructor(private configService: ConfigService) {
    const kid = this.configService.get<string>('RAZORPAY_KEY_ID');
    const ksec = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!kid || !ksec) {
      throw new Error(
        'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not defined in environment variables',
      );
    }

    this.keyId = kid;
    this.keySecret = ksec;

    this.REMOVED_PAYMENT_INFRA = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  /**
   * Create a Subscription (AutoPay)
   * NOTE: We do NOT send amount here. The plan_id determines the amount.
   */
  async createSubscription(
    planId: string,
    totalCount: number = 120,
    startAt?: number,
  ) {
    try {
      this.logger.log(`Creating Razorpay Subscription for Plan: ${planId}`);

      const options: any = {
        plan_id: planId,
        total_count: totalCount,
        customer_notify: 1,
      };

      if (startAt) {
        options.start_at = startAt;
      }

      const subscription = await this.REMOVED_PAYMENT_INFRA.subscriptions.create(options);
      return subscription;
    } catch (error: any) {
      this.logger.error(
        `Razorpay Subscription Creation Failed: ${error.message}`,
        error,
      );
      throw new BadRequestException(
        `Failed to create subscription: ${error.error?.description || error.message}`,
      );
    }
  }

  /**
   * Create a Payment Link (Manual)
   * @param amount Amount in PAISE
   */
  async createPaymentLink(
    amount: number,
    currency: string = 'INR',
    description: string,
    customer: { name: string; email: string; contact: string },
    referenceId: string,
    module: string = 'MOBILE_SHOP',
    notes?: Record<string, string>, // C-3: stored on Razorpay payment for orphan recovery
  ) {
    try {
      this.logger.log(
        `Creating Payment Link: ₹${amount / 100} for ${referenceId}`,
      );

      const frontendUrl =
        module === 'GYM'
          ? (process.env.GYM_FRONTEND_URL || 'https://mobibix.in')
          : (process.env.MOBIBIX_FRONTEND_URL || 'https://REMOVED_DOMAIN');

      const options = {
        amount: amount, // Keeping strict to PAISE
        currency,
        accept_partial: false,
        description,
        customer,
        notify: {
          sms: true,
          email: true,
        },
        reminder_enable: true,
        reference_id: referenceId,
        callback_url: `${frontendUrl}/settings?payment=success`,
        callback_method: 'get',
        notes: notes || {},
      };

      const paymentLink = await this.REMOVED_PAYMENT_INFRA.paymentLink.create(options);
      return paymentLink;
    } catch (error: any) {
      this.logger.error(
        `Razorpay Payment Link Failed: ${error.message}`,
        error,
      );
      throw new BadRequestException(
        `Failed to create payment link: ${error.error?.description || error.message}`,
      );
    }
  }

  async fetchSubscription(subscriptionId: string) {
    try {
      return await this.REMOVED_PAYMENT_INFRA.subscriptions.fetch(subscriptionId);
    } catch (error: any) {
      this.logger.error(`Fetch Subscription Failed: ${error.message}`);
      return null;
    }
  }

  async fetchPaymentLink(linkId: string) {
    try {
      return await this.REMOVED_PAYMENT_INFRA.paymentLink.fetch(linkId);
    } catch (error: any) {
      this.logger.error(`Fetch Payment Link Failed: ${error.message}`);
      return null;
    }
  }

  validateWebhookSignature(
    rawBody: Buffer | string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Fetch a single payment
   */
  async fetchPayment(paymentId: string) {
    try {
      this.logger.log(`Fetching Razorpay Payment: ${paymentId}`);
      return await this.REMOVED_PAYMENT_INFRA.payments.fetch(paymentId);
    } catch (error: any) {
      this.logger.error(`Fetch Payment Failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch all payments within a range
   * @param from Unix timestamp (seconds)
   * @param to Unix timestamp (seconds)
   */
  async fetchRecentPayments(from?: number, to?: number) {
    try {
      this.logger.log(`Fetching Razorpay Payments from ${from} to ${to}`);
      return await this.REMOVED_PAYMENT_INFRA.payments.all({
        from,
        to,
        count: 100,
      });
    } catch (error: any) {
      this.logger.error(`Fetch All Payments Failed: ${error.message}`);
      return { items: [] };
    }
  }

  /**
   * Cancel a Subscription
   * Used when user toggles off Auto-Renew for an AutoPay plan
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      this.logger.log(`Cancelling Razorpay Subscription: ${subscriptionId}`);
      // cancel_at_cycle_end=0 (immediate) or 1 (at cycle end)
      // Usually for "Stop AutoRenew", we might want to cancel at cycle end?
      // But Razorpay 'cancel' API often cancels immediately or schedules.
      // Let's us 'cancel' which moves to CANCELLED state?
      // Actually, if we want to just stop *future* charges but keep current access,
      // we usually rely on 'cancel_at_cycle_end'.

      const response = await this.REMOVED_PAYMENT_INFRA.subscriptions.cancel(
        subscriptionId,
        false,
      );
      // false = cancel at end of cycle (pending_cancel)
      // true = cancel immediately

      return response;
    } catch (error: any) {
      this.logger.error(
        `Razorpay Subscription Cancellation Failed: ${error.message}`,
        error,
      );
      // Don't throw if already cancelled
      if (error.error?.code === 'BAD_REQUEST_ERROR') return null;
      throw new BadRequestException(
        `Failed to cancel subscription: ${error.error?.description || error.message}`,
      );
    }
  }

  /**
   * Update a Subscription (AutoPay)
   * Used for upgrading/downgrading an existing Razorpay subscription.
   * Changes take effect from the NEXT billing cycle.
   */
  async updateSubscription(subscriptionId: string, planId: string) {
    try {
      this.logger.log(
        `Updating Razorpay Subscription ${subscriptionId} to Plan: ${planId}`,
      );
      const response = await this.REMOVED_PAYMENT_INFRA.subscriptions.update(
        subscriptionId,
        {
          plan_id: planId,
        },
      );
      return response;
    } catch (error: any) {
      this.logger.error(
        `Razorpay Subscription Update Failed: ${error.message}`,
        error,
      );
      throw new BadRequestException(
        `Failed to update subscription: ${error.error?.description || error.message}`,
      );
    }
  }
}
