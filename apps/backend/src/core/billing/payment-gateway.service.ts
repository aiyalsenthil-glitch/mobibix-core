import { Injectable, Logger } from '@nestjs/common';

export interface PaymentProcessResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  amount: number;
  currency: string;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  /**
   * Process a payment (Mock Implementation)
   *
   * @param amount Amount in smallest currency unit (e.g., paise)
   * @param currency Currency code (e.g., 'INR')
   * @param token Payment token (mock: 'tok_success' or 'tok_fail')
   */
  async processPayment(
    amount: number,
    currency: string,
    token: string,
  ): Promise<PaymentProcessResult> {
    this.logger.log(
      `Processing mock payment: ${amount} ${currency} (Token: ${token})`,
    );

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock Logic
    if (token === 'tok_success') {
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return {
        success: true,
        transactionId,
        amount,
        currency,
      };
    } else {
      return {
        success: false,
        error: 'Payment declined (Mock)',
        amount,
        currency,
      };
    }
  }
}
