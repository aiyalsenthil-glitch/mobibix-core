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
export async function bypassPayment(planId: string, billingCycle: string): Promise<Record<string, unknown>> {
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


export interface PaymentRecord {
  id: string;
  tenantId: string;
  planId: string;
  plan?: { name: string; code: string };
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  billingCycle?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get payment history for current tenant
 */
export async function getPaymentHistory(): Promise<PaymentRecord[]> {
  const response = await authenticatedFetch("/billing/payments/history");

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to fetch payment history");
  }

  const data = await extractData(response);
  return Array.isArray(data) ? data : data.data || [];
}

/**
 * Retry a failed payment
 */
export async function retryPayment(paymentId: string): Promise<Record<string, unknown>> {
  const response = await authenticatedFetch(`/billing/payments/${paymentId}/retry`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to retry payment");
  }

  return extractData(response);
}
