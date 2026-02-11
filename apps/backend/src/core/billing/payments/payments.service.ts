import Razorpay from 'REMOVED_PAYMENT_INFRA';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  private REMOVED_PAYMENT_INFRA: Razorpay | null = null;
  private logger = new Logger(PaymentsService.name);

  // Payment expiry duration in minutes
  private readonly PAYMENT_EXPIRY_MINUTES = 15;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret) {
      try {
        this.REMOVED_PAYMENT_INFRA = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });
        this.logger.log('Razorpay initialized successfully');
      } catch (error) {
        this.logger.warn('Failed to initialize Razorpay', error);
      }
    } else {
      this.logger.warn(
        'Razorpay credentials not provided. Payments will not be available.',
      );
    }
  }

  async createOrder(params: {
    amount: number;
    tenantId: string;
    planId: string;
  }): Promise<{ order: any; expiresAt: Date }> {
    if (!this.REMOVED_PAYMENT_INFRA) {
      throw new Error(
        'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.',
      );
    }

    // Calculate expiry time (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.PAYMENT_EXPIRY_MINUTES);

    const order = await this.REMOVED_PAYMENT_INFRA.orders.create({
      amount: params.amount, // already in paise from DB
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      payment_capture: true, // ✅ BOOLEAN
      notes: {
        tenantId: params.tenantId,
        planId: params.planId,
        expiresAt: expiresAt.toISOString(), // Store in Razorpay notes
      },
    });

    this.logger.log(
      `Created Razorpay order ${order.id} expiring at ${expiresAt.toISOString()}`,
    );

    return { order, expiresAt };
  }

  /**
   * Check if a payment order has expired
   */
  isOrderExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return false;
    return new Date() > expiresAt;
  }
}
