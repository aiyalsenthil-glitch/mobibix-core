import Razorpay from 'REMOVED_PAYMENT_INFRA';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  private REMOVED_PAYMENT_INFRA = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  async createOrder(amount: number) {
    return this.REMOVED_PAYMENT_INFRA.orders.create({
      amount: amount * 100, // INR paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    });
  }
}
