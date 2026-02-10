/**
 * Security Fixes Test Script
 * 
 * Tests:
 * 1. Payment Idempotency - Double-click prevention
 * 2. Rate Limiting - Throttle enforcement
 * 3. Downgrade Validation - Member limit checks
 */

import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost_REPLACED:3000';
const TEST_TOKEN = process.env.TEST_JWT_TOKEN; // Set this to a valid JWT token

if (!TEST_TOKEN) {
  console.error('❌ TEST_JWT_TOKEN environment variable not set');
  process.exit(1);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${TEST_TOKEN}`,
  },
});

// ═══════════════════════════════════════════════════════════
// Test 1: Payment Idempotency
// ═══════════════════════════════════════════════════════════
async function testPaymentIdempotency() {
  console.log('\n🧪 Test 1: Payment Idempotency');
  console.log('─'.repeat(50));

  try {
    const payload = {
      planId: 'test-plan-id', // Replace with actual plan ID
      billingCycle: 'MONTHLY',
    };

    // First request
    console.log('📤 Sending first create-order request...');
    const response1 = await api.post('/payments/create-order', payload);
    const orderId1 = response1.data.orderId;
    console.log(`✅ First request: Order ID = ${orderId1}`);

    // Immediate second request (simulating double-click)
    console.log('📤 Sending second create-order request (double-click)...');
    const response2 = await api.post('/payments/create-order', payload);
    const orderId2 = response2.data.orderId;
    const isIdempotent = response2.data.idempotent;

    console.log(`✅ Second request: Order ID = ${orderId2}`);
    console.log(`   Idempotent flag: ${isIdempotent}`);

    // Verify idempotency
    if (orderId1 === orderId2 && isIdempotent === true) {
      console.log('✅ PASS: Idempotency working - same order returned');
    } else {
      console.log('❌ FAIL: Different orders created (duplicate charge risk!)');
    }
  } catch (error) {
    const err = error as AxiosError;
    console.error(`❌ Test failed: ${err.response?.data || err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════
// Test 2: Rate Limiting
// ═══════════════════════════════════════════════════════════
async function testRateLimiting() {
  console.log('\n🧪 Test 2: Rate Limiting');
  console.log('─'.repeat(50));

  try {
    const payload = {
      planId: 'test-plan-id',
      billingCycle: 'MONTHLY',
    };

    let successCount = 0;
    let throttledCount = 0;

    console.log('📤 Sending 10 rapid requests...');

    for (let i = 1; i <= 10; i++) {
      try {
        await api.post('/payments/create-order', payload);
        successCount++;
        console.log(`   Request ${i}: ✅ Success`);
      } catch (error) {
        const err = error as AxiosError;
        if (err.response?.status === 429) {
          throttledCount++;
          console.log(`   Request ${i}: 🛑 Throttled (429)`);
        } else {
          console.log(`   Request ${i}: ❌ Error ${err.response?.status}`);
        }
      }
      // Small delay to avoid overwhelming the server
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`\n📊 Results:`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Throttled: ${throttledCount}`);

    if (throttledCount > 0) {
      console.log('✅ PASS: Rate limiting is active');
    } else {
      console.log('⚠️  WARNING: No throttling detected (limit might be too high)');
    }
  } catch (error) {
    const err = error as AxiosError;
    console.error(`❌ Test failed: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════
// Test 3: Downgrade Validation
// ═══════════════════════════════════════════════════════════
async function testDowngradeValidation() {
  console.log('\n🧪 Test 3: Downgrade Validation');
  console.log('─'.repeat(50));

  try {
    // Get current subscription
    console.log('📤 Fetching current subscription...');
    const subResponse = await api.get('/billing/subscription/current');
    const currentSub = subResponse.data;

    console.log(`   Current Plan: ${currentSub.plan?.name}`);
    console.log(`   Member Limit: ${currentSub.plan?.maxMembers || 'Unlimited'}`);

    // Try to check downgrade eligibility
    console.log('\n📤 Checking downgrade eligibility...');
    const checkResponse = await api.get('/billing/subscription/downgrade-check', {
      params: {
        targetPlanId: 'basic-plan-id', // Replace with actual lower-tier plan ID
      },
    });

    const eligibility = checkResponse.data;
    console.log(`   Eligible: ${eligibility.isEligible}`);

    if (!eligibility.isEligible) {
      console.log(`   Blockers:`);
      eligibility.blockers.forEach((blocker: string) => {
        console.log(`     - ${blocker}`);
      });
      console.log('✅ PASS: Downgrade validation working');
    } else {
      console.log('⚠️  INFO: Downgrade allowed (no limit violations)');
    }
  } catch (error) {
    const err = error as AxiosError;
    if (err.response?.status === 400) {
      console.log('✅ PASS: Downgrade blocked by validation');
      console.log(`   Message: ${err.response.data}`);
    } else {
      console.error(`❌ Test failed: ${err.response?.data || err.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Run All Tests
// ═══════════════════════════════════════════════════════════
async function runAllTests() {
  console.log('🚀 Starting Security Fixes Test Suite');
  console.log('═'.repeat(50));

  await testPaymentIdempotency();
  await testRateLimiting();
  await testDowngradeValidation();

  console.log('\n' + '═'.repeat(50));
  console.log('✅ Test suite completed');
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
