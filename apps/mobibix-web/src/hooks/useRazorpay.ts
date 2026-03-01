import { useState, useCallback } from 'react';

interface RazorpayPaymentResponse {
  REMOVED_PAYMENT_INFRA_payment_id: string;
  REMOVED_PAYMENT_INFRA_order_id: string;
  REMOVED_PAYMENT_INFRA_signature: string;
}

interface RazorpayErrorResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      order_id: string;
      payment_id: string;
    };
  };
}

interface RazorpayOptions {
  key: string;
  amount: string | number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

interface RazorpayInstance {
  on: (event: string, handler: (response: RazorpayErrorResponse) => void) => void;
  open: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export const useRazorpay = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  const loadRazorpay = useCallback(() => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        setIsLoaded(true);
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.REMOVED_PAYMENT_INFRA.com/v1/checkout.js';
      script.onload = () => {
        setIsLoaded(true);
        resolve(true);
      };
      script.onerror = () => {
        setIsLoaded(false);
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }, []);

  const openPayment = useCallback(
    async (options: RazorpayOptions) => {
      const loaded = await loadRazorpay();
      if (!loaded) {
        alert('Razorpay SDK failed to load. Please check your connection.');
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: RazorpayErrorResponse) {
        alert(response.error.description);
      });
      rzp.open();
    },
    [loadRazorpay]
  );

  return { isLoaded, openPayment };
};
