import Razorpay from 'REMOVED_PAYMENT_INFRA';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  private REMOVED_PAYMENT_INFRA: Razorpay | null = null;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret) {
      this.REMOVED_PAYMENT_INFRA = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
  }

  private ensureRazorpay() {
    if (!this.REMOVED_PAYMENT_INFRA) {
      throw new Error('Razorpay is not configured');
    }
    return this.REMOVED_PAYMENT_INFRA;
  }

  async createOrder(amount: number) {
    const REMOVED_PAYMENT_INFRA = this.ensureRazorpay();

    return REMOVED_PAYMENT_INFRA.orders.create({
      amount: amount * 100, // INR paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    });
  }
}
