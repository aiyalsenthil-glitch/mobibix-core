import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * =========================================================================
 * MobiBix Load Test: invoice-burst.js
 * =========================================================================
 * Scenario: 
 *   Simulating 50 staff members at the exact same Tenant (Shop) hitting 
 *   "Complete Sale" at the exact same millisecond. 
 *
 * Risk Vector:
 *   If the API doesn't use proper Advisory Locks or Database Transactions, 
 *   multiple invoices will be generated with the exact same `invoiceNumber` 
 *   (e.g., INV-001) causing critical ledger corruption.
 */

export const options = {
  scenarios: {
    invoice_surge: {
      executor: 'per-vu-iterations',
      // We want to simulate highly concurrent creation
      vus: 50,      // 50 simultaneous Virtual Users 
      iterations: 1, // Each user fires exactly 1 request at the same time
      maxDuration: '10s', 
    },
  },
  thresholds: {
    // We expect ZERO 500 exceptions during a concurrency burst
    http_req_failed: ['rate==0.0'], 
    // Expect 95% of invoices to process under 800ms even under heavy lock contention
    http_req_duration: ['p(95)<800'], 
  },
};

// Replace these with dynamically fetched test data in a real CI environment
const BASE_URL = __ENV.API_URL || 'http://localhost_REPLACED:3000/api';
const TENANT_ID = __ENV.TENANT_ID || 'test_tenant_123';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test_token'; 

export default function () {
  const url = `${BASE_URL}/sales`;
  const payload = JSON.stringify({
    tenantId: TENANT_ID,
    totalAmount: Math.floor(Math.random() * 5000) + 100, // Random amount
    paymentMode: 'CASH',
    items: [
      {
        productId: 'prod_test_1',
        quantity: 1,
        unitPrice: 150,
      },
    ],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
      // Optionally inject correlation IDs if observability is implemented
      'x-correlation-id': `k6-invoice-burst-${__VU}-${__ITER}`,
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'Invoice created successfully (201)': (r) => r.status === 201,
    'Concurrency locks held nicely (No 500s)': (r) => r.status !== 500,
  });

  sleep(0.1);
}
