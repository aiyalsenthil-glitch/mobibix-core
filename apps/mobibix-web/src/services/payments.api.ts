import { authenticatedFetch, extractData } from "./auth.api";

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
    const error = await extractData(response);
    throw new Error(error.message || "Failed to create payment order");
  }
  
  return extractData(response);
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
    const error = await extractData(response);
    throw new Error(error.message || "Payment verification failed");
  }

  return extractData(response);
}

/**
 * BYPASS FOR TESTING: Skip Razorpay and activate directly
 * ONLY FOR DEVELOPMENT/TESTING - Endpoint may not exist in prod
 */
export async function bypassPayment(planId: string, billingCycle: string): Promise<any> {
    const response = await authenticatedFetch("/payments/bypass-activation", {
        method: "POST",
        body: JSON.stringify({ planId, billingCycle }),
    });

    if (!response.ok) {
        const error = await extractData(response);
        throw new Error(error.message || "Bypass failed");
    }

    return extractData(response);
}


