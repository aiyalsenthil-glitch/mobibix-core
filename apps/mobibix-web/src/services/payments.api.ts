import { authenticatedFetch } from "./auth.api";

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  subscriptionCreated: boolean;
  message?: string;
}

/**
 * Create Razorpay Order
 */
export async function createOrder(planId: string, billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'): Promise<CreateOrderResponse> {
  const response = await authenticatedFetch("/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ planId, billingCycle }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create payment order");
  }
  
  return response.json();
}

/**
 * Verify Razorpay Payment and Activate Subscription
 */
export async function verifyPayment(data: {
  orderId: string;
  paymentId: string;
  signature: string;
  planId: string;
  billingCycle: string;
}): Promise<VerifyPaymentResponse> {
  const response = await authenticatedFetch("/payments/verify", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Payment verification failed");
  }

  return response.json();
}

/**
 * Bypass Razorpay and Activate Directly (TESTING ONLY)
 */
export async function bypassPayment(planId: string, billingCycle: string = 'MONTHLY'): Promise<any> {
    const response = await authenticatedFetch("/billing/subscription/test-bypass", {
      method: "POST",
      body: JSON.stringify({ planId, billingCycle }),
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Bypass activation failed");
    }
  
    return response.json();
}
