import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Burst to 50 sessions
    { duration: '2m', target: 200 }, // Ramp to 200 sessions
    { duration: '2m', target: 500 }, // Ramp to 500 sessions
    { duration: '5m', target: 1000 },// Target scale: 1000 sessions
    { duration: '2m', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s (QR generation)
    http_req_failed: ['rate<0.01'],    // Less than 1% failure rate
  },
};

const BASE_URL = 'http://localhost_REPLACED:3001/whatsapp';

export default function () {
  const tenantId = `tenant-${__VU}-${__ITER}`;
  
  // 1. Initial Connection Request
  const connectRes = http.post(`${BASE_URL}/connect`, JSON.stringify({ tenantId }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(connectRes, {
    'connect status is 201': (r) => r.status === 201,
    'has sessionId': (r) => r.json().sessionId !== undefined,
  });

  // 2. Poll for Status/QR
  for (let i = 0; i < 5; i++) {
    sleep(2);
    const statusRes = http.get(`${BASE_URL}/status/${tenantId}`);
    check(statusRes, {
      'status check successful': (r) => r.status === 200,
    });
  }

  sleep(1);
}
