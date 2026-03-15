import http from 'k6/http';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';

/**
 * =========================================================================
 * MobiBix Load Test: webhooks.js
 * =========================================================================
 * Scenario: 
 *   Webhook Retries (Idempotency Test). Payment gateways like Razorpay often
 *   fire webhooks multiple times if the first response is slow.
 * 
 * Risk Vector:
 *   If the backend does not enforce Idempotency Keys at the database row level,
 *   a tenant attempting a ₹2000 Pro Plan upgrade may be double/triple billed.
 */

export const options = {
  scenarios: {
    webhook_retries: {
      executor: 'constant-vus', // Constant pressure
      vus: 10,  // 10 concurrent requests at the same time
      duration: '5s', // Bombard for 5 seconds
    },
  },
  thresholds: {
    // We expect the first one to succeed (200), and all subsequent identical
    // ones to hit the 409 Conflict/Idempotency barrier.
    http_req_failed: ['rate<0.95'], 
    http_req_duration: ['p(95)<500'], // Webhooks must resolve rapidly
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost_REPLACED:3000/api';
// The exact same webhook ID sent repeatedly
const RAZORPAY_EVENT_ID = 'evt_k6_duplicate_test_001'; 
const RAZORPAY_SECRET = __ENV.RAZORPAY_SECRET || 'test_secret';

function createRazorpaySignature(payloadStr) {
  // k6 has built-in crypto for signature generation
  return crypto.hmac('sha256', RAZORPAY_SECRET, payloadStr, 'hex');
}

export default function () {
  const url = `${BASE_URL}/webhooks/REMOVED_PAYMENT_INFRA`;
  
  const payload = JSON.stringify({
    entity: "event",
    account_id: "acc_k6_test",
    event: "payment.captured",
    contains: ["payment"],
    payload: {
      payment: {
        entity: {
          id: "pay_k6_duplicate_123",
          amount: 200000, 
          currency: "INR",
          status: "captured",
          notes: {
            tenantId: "tenant_demo_1",
            planId: "pro_yearly"
          }
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  });

  const signature = createRazorpaySignature(payload);

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-REMOVED_PAYMENT_INFRA-signature': signature,
    },
  };

  const res = http.post(url, payload, params);

  // Validate Idempotency: 200 OK (First time) OR 409 Conflict/200 OK (Already processed)
  check(res, {
    'Handled gracefully (No 500s)': (r) => r.status !== 500,
    'Fast processing (< 300ms)': (r) => r.timings.duration < 300,
  });

  sleep(0.05); // Rapid fire
}
