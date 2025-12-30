import Razorpay from 'REMOVED_PAYMENT_INFRA';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  private REMOVED_PAYMENT_INFRA: Razorpay;

  constructor() {
    this.REMOVED_PAYMENT_INFRA = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  async createOrder(params: {
    amount: number;
    tenantId: string;
    planId: string;
  }) {
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
