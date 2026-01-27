import Razorpay from 'REMOVED_PAYMENT_INFRA';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  private REMOVED_PAYMENT_INFRA: Razorpay | null = null;
  private logger = new Logger(PaymentsService.name);

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
  }) {
    if (!this.REMOVED_PAYMENT_INFRA) {
      throw new Error(
        'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.',
      );
    }

    const order = await this.REMOVED_PAYMENT_INFRA.orders.create({
      amount: params.amount * 100, // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      payment_capture: true, // ✅ BOOLEAN
      notes: {
        tenantId: params.tenantId,
        planId: params.planId,
      },
    });

    return order; // ✅ must return
  }
}
