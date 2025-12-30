import Razorpay from 'REMOVED_PAYMENT_INFRA';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  private REMOVED_PAYMENT_INFRA: Razorpay;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay keys not configured');
    }

    this.REMOVED_PAYMENT_INFRA = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createOrder(params: {
    amount: number; // in rupees
    tenantId: string;
    planId: string;
  }) {
    const order = await this.REMOVED_PAYMENT_INFRA.orders.create({
      amount: params.amount * 100, // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        tenantId: params.tenantId,
        planId: params.planId,
      },
    });

    return order; // ✅ VERY IMPORTANT
  }
}
