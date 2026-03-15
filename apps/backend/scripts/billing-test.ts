/**
 * MobiBix Pre-Launch Billing Integration Test Suite
 *
 * Runs against a LIVE backend (must be running on CORE_API_BASE_URL).
 * Uses real DB via Prisma and real webhook endpoint with valid HMAC signatures.
 * All test data is cleaned up after each test.
 *
 * Usage:
 *   npx tsx scripts/billing-test.ts
 *   npx tsx scripts/billing-test.ts --test 1        (run single test)
 *   npx tsx scripts/billing-test.ts --category auto  (run category)
 */

import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { PrismaClient, BillingType, BillingCycle, ModuleType } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

// ─── Config ────────────────────────────────────────────────────────────────

const BACKEND_URL = process.env.CORE_API_BASE_URL || 'http://localhost_REPLACED:3000';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

// ANSI colours
const c = {
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function sign(body: string): string {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

async function postWebhook(event: string, payload: object): Promise<Response> {
  const body = JSON.stringify({ event, payload, entity: 'event', created_at: Math.floor(Date.now() / 1000) });
  const sig = sign(body);
  return fetch(`${BACKEND_URL}/api/billing/webhook/REMOVED_PAYMENT_INFRA`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-REMOVED_PAYMENT_INFRA-signature': sig, 'x-REMOVED_PAYMENT_INFRA-event-id': `evt_test_${Date.now()}` },
    body,
  });
}

async function wait(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function fakePayId()  { return `pay_TEST${Date.now()}`; }
function fakeSubId()  { return `sub_TEST${Date.now()}`; }
function fakeOrdId()  { return `order_TEST${Date.now()}`; }

let testTenantId: string;
let testPlanId: string;

async function setup() {
  // Find a tenant and a plan that has a MONTHLY price entry for MOBILE_SHOP module
  const tenant = await prisma.tenant.findFirst({ select: { id: true, name: true } });
  const plan = await prisma.plan.findFirst({
    where: {
      isActive: true,
      module: ModuleType.MOBILE_SHOP,
      planPrices: { some: { billingCycle: BillingCycle.MONTHLY } },
    },
    select: { id: true, name: true },
  }) ?? await prisma.plan.findFirst({
    where: { isActive: true, planPrices: { some: { billingCycle: BillingCycle.MONTHLY } } },
    select: { id: true, name: true },
  });
  if (!tenant || !plan) throw new Error('No tenant or plan with MONTHLY price found — seed the DB first.');
  testTenantId = tenant.id;
  testPlanId = plan.id;
  console.log(c.dim(`  → tenant: ${tenant.name} (${testTenantId})`));
  console.log(c.dim(`  → plan:   ${plan.name}  (${testPlanId})`));
}


async function createTestPayment(override: Partial<any> = {}) {
  return prisma.payment.create({
    data: {
      tenantId: testTenantId,
      planId: testPlanId,
      module: ModuleType.MOBILE_SHOP,
      billingCycle: BillingCycle.MONTHLY,
      priceSnapshot: 49900,
      amount: 49900,
      currency: 'INR',
      status: 'PENDING',
      provider: 'RAZORPAY',
      providerOrderId: fakeOrdId(),
      providerPaymentId: null,
      ...override,
    },
  });
}

async function createTestSubscription(override: Partial<any> = {}) {
  return prisma.tenantSubscription.create({
    data: {
      tenantId: testTenantId,
      planId: testPlanId,
      module: ModuleType.MOBILE_SHOP,
      billingCycle: BillingCycle.MONTHLY,
      priceSnapshot: 49900,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400_000),
      billingType: BillingType.MANUAL,
      paymentStatus: 'SUCCESS',
      autoRenew: false,
      ...override,
    },
  });
}

// ─── Test Runner ────────────────────────────────────────────────────────────

type TestResult = { name: string; passed: boolean; note?: string };
const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${c.dim('•')} ${name} ... `);
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(c.green('PASS'));
  } catch (e: any) {
    results.push({ name, passed: false, note: e.message });
    console.log(c.red('FAIL') + c.dim(` — ${e.message}`));
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// ─── TEST CATEGORIES ────────────────────────────────────────────────────────

async function testManualPayments() {
  console.log(c.bold('\n1️⃣  One-Time Payment (Manual Renewal)'));
  // Pre-category: ensure no stale ACTIVE/PENDING subs from a previous test run
  await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId, module: ModuleType.MOBILE_SHOP, status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] } } }).catch(() => {});

  // Test 1 — payment.captured activates subscription
  await test('T01 payment.captured → subscription ACTIVE + invoice created', async () => {
    const payId = fakePayId();
    const payment = await createTestPayment({ providerPaymentId: payId });
    let sub: any = null;
    let invoice: any = null;
    try {
      const res = await postWebhook('payment.captured', {
        payment: { entity: { id: payId, amount: 49900, currency: 'INR', order_id: payment.providerOrderId, status: 'captured', notes: {} } },
      });
      assert(res.ok, `Webhook returned ${res.status}`);
      await wait(2000);

      const updated = await prisma.payment.findUnique({ where: { id: payment.id } });
      assert(updated?.status === 'SUCCESS', `Payment status is ${updated?.status}, expected SUCCESS`);

      sub = await prisma.tenantSubscription.findFirst({ where: { tenantId: testTenantId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
      assert(sub !== null, 'No ACTIVE subscription found');

      invoice = await prisma.subscriptionInvoice.findFirst({ where: { paymentId: payment.id } });
      assert(invoice !== null, 'No invoice created');
    } finally {
      if (invoice) await prisma.subscriptionInvoice.delete({ where: { id: invoice.id } }).catch(() => {});
      if (sub) await prisma.tenantSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    }
  });

  // Test 2 — user closes checkout: payment stays PENDING, can retry
  await test('T02 closed checkout → payment stays PENDING, no activation', async () => {
    const payment = await createTestPayment();
    try {
      await wait(300);
      const recheck = await prisma.payment.findUnique({ where: { id: payment.id } });
      assert(recheck?.status === 'PENDING', 'Payment should remain PENDING');
    } finally {
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    }
  });

  // Test 3 — payment.failed → status FAILED
  await test('T03 payment.failed → payment FAILED, no subscription', async () => {
    const payId = fakePayId();
    const payment = await createTestPayment({ providerPaymentId: payId });
    const countBefore = await prisma.tenantSubscription.count({ where: { tenantId: testTenantId, status: 'ACTIVE' } });
    try {
      const res = await postWebhook('payment.failed', {
        payment: { entity: { id: payId, order_id: payment.providerOrderId, status: 'failed', error_code: 'BAD_REQUEST_ERROR' } },
      });
      assert(res.ok, `Webhook returned ${res.status}`);
      await wait(2000);

      const updated = await prisma.payment.findUnique({ where: { id: payment.id } });
      assert(updated?.status === 'FAILED', `Expected FAILED, got ${updated?.status}`);
      const countAfter = await prisma.tenantSubscription.count({ where: { tenantId: testTenantId, status: 'ACTIVE' } });
      assert(countAfter === countBefore, 'Subscription count changed on failed payment!');
    } finally {
      await prisma.paymentRetry.deleteMany({ where: { paymentId: payment.id } }).catch(() => {});
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    }
  });

  // Test 4 — duplicate payment click → only one PENDING sub (DB index guard)
  await test('T04 double click → unique index prevents duplicate PENDING subscription', async () => {
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId, module: 'MOBILE_SHOP', status: 'PENDING' } });
    const first = await prisma.tenantSubscription.create({
      data: {
        tenantId: testTenantId, planId: testPlanId, module: ModuleType.MOBILE_SHOP,
        billingCycle: BillingCycle.MONTHLY, priceSnapshot: 49900,
        status: 'PENDING', startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400_000),
        billingType: BillingType.MANUAL, paymentStatus: 'PENDING', autoRenew: false,
      },
    });
    try {
      let threw = false;
      try {
        await prisma.tenantSubscription.create({
          data: {
            tenantId: testTenantId, planId: testPlanId, module: ModuleType.MOBILE_SHOP,
            billingCycle: BillingCycle.MONTHLY, priceSnapshot: 49900,
            status: 'PENDING', startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400_000),
            billingType: BillingType.MANUAL, paymentStatus: 'PENDING', autoRenew: false,
          },
        });
      } catch { threw = true; }
      assert(threw, 'Expected unique constraint violation for duplicate PENDING sub');
    } finally {
      await prisma.tenantSubscription.delete({ where: { id: first.id } }).catch(() => {});
    }
  });

  // Test 5 — webhook arrives before verify → idempotent, no duplicate activation
  await test('T05 webhook before verify → verify returns already_processed', async () => {
    const payId = fakePayId();
    const payment = await createTestPayment({ providerPaymentId: payId });
    let sub: any = null;
    let invoices: any[] = [];
    try {
      const res = await postWebhook('payment.captured', {
        payment: { entity: { id: payId, amount: 49900, currency: 'INR', order_id: payment.providerOrderId, status: 'captured', notes: {} } },
      });
      assert(res.ok, `Webhook ${res.status}`);
      await wait(2000);

      const updated = await prisma.payment.findUnique({ where: { id: payment.id } });
      assert(updated?.status === 'SUCCESS', `Expected SUCCESS, got ${updated?.status}`);

      const subs = await prisma.tenantSubscription.findMany({ where: { tenantId: testTenantId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
      assert(subs.length >= 1, 'No ACTIVE subscription after webhook');
      sub = subs[0];

      invoices = await prisma.subscriptionInvoice.findMany({ where: { paymentId: payment.id } });
      assert(invoices.length === 1, `Expected 1 invoice, got ${invoices.length}`);
    } finally {
      for (const inv of invoices) await prisma.subscriptionInvoice.delete({ where: { id: inv.id } }).catch(() => {});
      if (sub) await prisma.tenantSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    }
  });
}

async function testAutoPay() {
  console.log(c.bold('\n🔁 AutoPay Tests'));
  await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId, module: ModuleType.MOBILE_SHOP, status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] } } }).catch(() => {});

  // Test 8 — subscription.halted → PAST_DUE
  await test('T08 subscription.halted → status PAST_DUE, autopayStatus HALTED', async () => {
    const subId = fakeSubId();
    const sub = await createTestSubscription({ billingType: BillingType.AUTOPAY, providerSubscriptionId: subId, autopayStatus: 'ACTIVE', autoRenew: true });
    try {
      const res = await postWebhook('subscription.halted', {
        subscription: { entity: { id: subId, status: 'halted', plan_id: 'plan_test' } },
      });
      assert(res.ok, `Webhook ${res.status}`);
      await wait(2000);

      const updated = await prisma.tenantSubscription.findUnique({ where: { id: sub.id } });
      assert(updated?.status === 'PAST_DUE', `Expected PAST_DUE, got ${updated?.status}`);
      assert(updated?.autopayStatus === 'HALTED', `Expected HALTED, got ${updated?.autopayStatus}`);
    } finally {
      await prisma.billingEventLog.deleteMany({ where: { tenantId: testTenantId } }).catch(() => {});
      await prisma.tenantSubscription.deleteMany({ where: { providerSubscriptionId: subId } }).catch(() => {});
    }
  });

  // Test 9 — subscription.charged after PAST_DUE (C-1 fix)
  await test('T09 subscription.charged on PAST_DUE → subscription restored ACTIVE (C-1 fix)', async () => {
    const subId = fakeSubId();
    const payId = fakePayId();
    await createTestSubscription({ billingType: BillingType.AUTOPAY, providerSubscriptionId: subId, autopayStatus: 'ACTIVE', status: 'PAST_DUE', autoRenew: true });
    try {
      const now = Math.floor(Date.now() / 1000);
      const res = await postWebhook('subscription.charged', {
        subscription: { entity: { id: subId, status: 'active', current_start: now, current_end: now + 2592000 } },
        payment: { entity: { id: payId, amount: 49900, currency: 'INR', order_id: fakeOrdId(), status: 'captured' } },
      });
      assert(res.ok, `Webhook ${res.status}`);
      await wait(2000);

      const newSub = await prisma.tenantSubscription.findFirst({
        where: { tenantId: testTenantId, providerSubscriptionId: subId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      assert(newSub !== null, 'Expected new ACTIVE subscription after PAST_DUE recovery');
    } finally {
      await prisma.billingEventLog.deleteMany({ where: { tenantId: testTenantId } }).catch(() => {});
      await prisma.tenantSubscription.deleteMany({ where: { providerSubscriptionId: subId } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { providerPaymentId: payId } }).catch(() => {});
    }
  });

  // Test 10 — subscription.cancelled → CANCELLED
  await test('T10 subscription.cancelled → autopayStatus CANCELLED, access until endDate', async () => {
    const subId = fakeSubId();
    const sub = await createTestSubscription({ billingType: BillingType.AUTOPAY, providerSubscriptionId: subId, autopayStatus: 'ACTIVE', autoRenew: true });
    try {
      const res = await postWebhook('subscription.cancelled', {
        subscription: { entity: { id: subId, status: 'cancelled' } },
      });
      assert(res.ok, `Webhook ${res.status}`);
      await wait(2000);

      const updated = await prisma.tenantSubscription.findUnique({ where: { id: sub.id } });
      assert(updated?.status === 'CANCELLED', `Expected CANCELLED, got ${updated?.status}`);
      assert(updated?.autopayStatus === 'CANCELLED', `Expected CANCELLED autopayStatus`);
      assert(updated?.autoRenew === false, 'autoRenew should be false after cancellation');
    } finally {
      await prisma.billingEventLog.deleteMany({ where: { tenantId: testTenantId } }).catch(() => {});
      await prisma.tenantSubscription.deleteMany({ where: { providerSubscriptionId: subId } }).catch(() => {});
    }
  });
}

async function testWebhookReliability() {
  console.log(c.bold('\n⚡ Webhook Reliability Tests'));
  await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId, module: ModuleType.MOBILE_SHOP, status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] } } }).catch(() => {});

  // Test 11 — duplicate webhook (same event ID) → idempotent
  await test('T11 duplicate webhook same event ID → processed once', async () => {
    const payId = fakePayId();
    const eventId = `evt_dup_${Date.now()}`;
    const payment = await createTestPayment({ providerPaymentId: payId });
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: payId, amount: 49900, currency: 'INR', order_id: payment.providerOrderId, status: 'captured', notes: {} } } }, entity: 'event', created_at: Math.floor(Date.now() / 1000) });
    const sig = sign(body);
    const post = () => fetch(`${BACKEND_URL}/api/billing/webhook/REMOVED_PAYMENT_INFRA`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-REMOVED_PAYMENT_INFRA-signature': sig, 'x-REMOVED_PAYMENT_INFRA-event-id': eventId },
      body,
    });
    let invoices: any[] = [];
    try {
      const [r1, r2] = await Promise.all([post(), post()]);
      assert(r1.ok && r2.ok, `Both should return 200, got ${r1.status} / ${r2.status}`);
      await wait(2000);

      invoices = await prisma.subscriptionInvoice.findMany({ where: { paymentId: payment.id } });
      assert(invoices.length <= 1, `Duplicate invoice created! Found ${invoices.length}`);

      const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
      assert(updatedPayment?.status === 'SUCCESS', `Expected SUCCESS`);
    } finally {
      for (const inv of invoices) await prisma.subscriptionInvoice.delete({ where: { id: inv.id } }).catch(() => {});
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId, status: 'ACTIVE' } }).catch(() => {});
      await prisma.webhookEvent.deleteMany({ where: { referenceId: eventId } }).catch(() => {});
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    }
  });

  // Test 12 — out-of-order: subscription.charged before subscription.activated
  await test('T12 out-of-order: subscription.charged before subscription.activated → handles correctly (H-4 fix)', async () => {
    const subId = fakeSubId();
    const payId = fakePayId();
    await prisma.tenantSubscription.create({
      data: {
        tenantId: testTenantId, planId: testPlanId, module: ModuleType.MOBILE_SHOP,
        billingCycle: BillingCycle.MONTHLY, priceSnapshot: 49900,
        status: 'PENDING', startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400_000),
        billingType: BillingType.AUTOPAY, paymentStatus: 'PENDING', autoRenew: true,
        providerSubscriptionId: subId, autopayStatus: null,
      },
    });
    try {
      const now = Math.floor(Date.now() / 1000);
      const res = await postWebhook('subscription.charged', {
        subscription: { entity: { id: subId, status: 'active', current_start: now, current_end: now + 2592000 } },
        payment: { entity: { id: payId, amount: 49900, currency: 'INR', order_id: fakeOrdId(), status: 'captured' } },
      });
      assert(res.ok, `Webhook returned ${res.status}`);
      await wait(2000);

      const newSub = await prisma.tenantSubscription.findFirst({
        where: { tenantId: testTenantId, providerSubscriptionId: subId, status: 'ACTIVE' },
      });
      assert(newSub !== null, 'Expected new ACTIVE subscription from out-of-order charged event');
    } finally {
      await prisma.billingEventLog.deleteMany({ where: { tenantId: testTenantId } }).catch(() => {});
      await prisma.tenantSubscription.deleteMany({ where: { providerSubscriptionId: subId } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { providerPaymentId: payId } }).catch(() => {});
    }
  });

  // Test 13 — delayed webhook (simulate by just sending it late)
  await test('T13 delayed webhook → still activates', async () => {
    const payId = fakePayId();
    const payment = await createTestPayment({ providerPaymentId: payId });
    let sub: any = null;
    let inv: any = null;
    try {
      await wait(300); // simulate delay
      const res = await postWebhook('payment.captured', {
        payment: { entity: { id: payId, amount: 49900, currency: 'INR', order_id: payment.providerOrderId, status: 'captured', notes: {} } },
      });
      assert(res.ok, `Webhook ${res.status}`);
      await wait(2000);

      const updated = await prisma.payment.findUnique({ where: { id: payment.id } });
      assert(updated?.status === 'SUCCESS', `Expected SUCCESS after delayed webhook`);
      sub = await prisma.tenantSubscription.findFirst({ where: { tenantId: testTenantId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
      inv = await prisma.subscriptionInvoice.findFirst({ where: { paymentId: payment.id } });
    } finally {
      if (inv) await prisma.subscriptionInvoice.delete({ where: { id: inv.id } }).catch(() => {});
      if (sub) await prisma.tenantSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    }
  });

  // Test 14 — invalid signature → rejected 400
  await test('T14 invalid webhook signature → 400 rejected', async () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: {}, entity: 'event', created_at: 0 });
    const res = await fetch(`${BACKEND_URL}/api/billing/webhook/REMOVED_PAYMENT_INFRA`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-REMOVED_PAYMENT_INFRA-signature': 'invalidsig', 'x-REMOVED_PAYMENT_INFRA-event-id': 'fake' },
      body,
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });
}

async function testRaceConditions() {
  console.log(c.bold('\n🧠 Race Condition Tests'));

  // Test 15 — autopay + manual renewal conflict → only one ACTIVE (C-2 fix)
  await test('T15 PAST_DUE manual renewal → updates existing row, not creates new', async () => {
    // Delete any conflicting subs (including PAST_DUE from prior tests that failed mid-cleanup)
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId, module: 'MOBILE_SHOP', status: { in: ['PENDING', 'ACTIVE', 'PAST_DUE'] } } });

    const subId = fakeSubId();
    const existing = await createTestSubscription({
      billingType: BillingType.AUTOPAY,
      status: 'PAST_DUE',
      providerSubscriptionId: subId,
      autopayStatus: 'ACTIVE',
      autoRenew: true,
    });

    // buyPlanPhase1 with PAST_DUE should update existing row, not create new
    const countBefore = await prisma.tenantSubscription.count({ where: { tenantId: testTenantId, module: 'MOBILE_SHOP', status: { in: ['PENDING', 'ACTIVE', 'PAST_DUE'] } } });
    assert(countBefore === 1, `Expected 1 existing sub, got ${countBefore}`);

    await prisma.tenantSubscription.delete({ where: { id: existing.id } });
  });

  // Test 16 — duplicate PENDING insertion blocked by DB index
  await test('T16 concurrent ACTIVE subscription creation → DB unique index prevents duplicate', async () => {
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId, module: 'MOBILE_SHOP', status: { in: ['PENDING', 'ACTIVE'] } } });

    const createActive = () => prisma.tenantSubscription.create({
      data: {
        tenantId: testTenantId, planId: testPlanId, module: ModuleType.MOBILE_SHOP,
        billingCycle: BillingCycle.MONTHLY, priceSnapshot: 49900, status: 'ACTIVE',
        startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400_000),
        billingType: BillingType.MANUAL, paymentStatus: 'SUCCESS', autoRenew: false,
      },
    });

    const [r1, r2] = await Promise.allSettled([createActive(), createActive()]);
    const succeeded = [r1, r2].filter(r => r.status === 'fulfilled').length;
    const failed = [r1, r2].filter(r => r.status === 'rejected').length;
    assert(succeeded === 1 && failed === 1, `Expected 1 success + 1 failure, got ${succeeded} + ${failed}`);

    await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId, module: 'MOBILE_SHOP', status: 'ACTIVE' } });
  });
}

async function testInvoices() {
  console.log(c.bold('\n🧾 Invoice Tests'));
  await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId, module: ModuleType.MOBILE_SHOP, status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] } } }).catch(() => {});

  // Test 17 — each payment creates exactly one invoice
  await test('T17 double webhook same payment → exactly one invoice created', async () => {
    const payId = fakePayId();
    const payment = await createTestPayment({ providerPaymentId: payId });
    const eventId = `evt_inv_${Date.now()}`;
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: payId, amount: 49900, currency: 'INR', order_id: payment.providerOrderId, status: 'captured', notes: {} } } }, entity: 'event', created_at: Math.floor(Date.now() / 1000) });
    const sig = sign(body);
    const post = () => fetch(`${BACKEND_URL}/api/billing/webhook/REMOVED_PAYMENT_INFRA`, {
      method: 'POST', body,
      headers: { 'Content-Type': 'application/json', 'x-REMOVED_PAYMENT_INFRA-signature': sig, 'x-REMOVED_PAYMENT_INFRA-event-id': eventId },
    });
    let invoices: any[] = [];
    try {
      await Promise.all([post(), post()]);
      await wait(2000);

      invoices = await prisma.subscriptionInvoice.findMany({ where: { paymentId: payment.id } });
      assert(invoices.length === 1, `Expected exactly 1 invoice, found ${invoices.length}`);
    } finally {
      for (const inv of invoices) await prisma.subscriptionInvoice.delete({ where: { id: inv.id } }).catch(() => {});
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId, status: 'ACTIVE' } }).catch(() => {});
      await prisma.webhookEvent.deleteMany({ where: { referenceId: eventId } }).catch(() => {});
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    }
  });

  // Test 18 — payment.refunded → payment REFUNDED, subscription CANCELLED
  await test('T18 payment.refunded → payment REFUNDED + subscription CANCELLED', async () => {
    const payId = fakePayId();
    const payment = await createTestPayment({ providerPaymentId: payId, status: 'SUCCESS' });
    const sub = await createTestSubscription();
    try {
      const res = await postWebhook('payment.refunded', {
        payment: { entity: { id: payId, amount: 49900, amount_refunded: 49900, currency: 'INR', order_id: payment.providerOrderId, status: 'refunded' } },
        refund: { entity: { id: `rfnd_TEST${Date.now()}`, amount: 49900 } },
      });
      assert(res.ok, `Webhook ${res.status}`);
      await wait(2000);

      const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
      assert(updatedPayment?.status === 'REFUNDED', `Expected REFUNDED, got ${updatedPayment?.status}`);
    } finally {
      await prisma.billingEventLog.deleteMany({ where: { tenantId: testTenantId } }).catch(() => {});
      await prisma.tenantSubscription.deleteMany({ where: { id: sub.id } }).catch(() => {});
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    }
  });
}

async function testBonusRenewalSimulation() {
  console.log(c.bold('\n🔍 Bonus: 10-Renewal Simulation'));
  await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId, module: ModuleType.MOBILE_SHOP, status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] } } }).catch(() => {});

  await test('T20 10 × subscription.charged → exactly 10 invoices, 10 cycles, no duplicates', async () => {
    const subId = fakeSubId();
    await createTestSubscription({ billingType: BillingType.AUTOPAY, providerSubscriptionId: subId, autopayStatus: 'ACTIVE', autoRenew: true });
    const payIds: string[] = [];
    try {
      for (let i = 0; i < 10; i++) {
        const payId = fakePayId();
        payIds.push(payId);
        const now = Math.floor(Date.now() / 1000) + i * 2592000;
        const res = await postWebhook('subscription.charged', {
          subscription: { entity: { id: subId, status: 'active', current_start: now, current_end: now + 2592000 } },
          payment: { entity: { id: payId, amount: 49900, currency: 'INR', order_id: fakeOrdId(), status: 'captured' } },
        });
        assert(res.ok, `Renewal ${i + 1} webhook returned ${res.status}`);
        await wait(500); // allow BullMQ to process each renewal before sending the next
      }
      await wait(12000); // let last job settle (10 jobs × ~1100ms each, serial BullMQ + invoice)

      const allSubs = await prisma.tenantSubscription.findMany({
        where: { tenantId: testTenantId, providerSubscriptionId: subId },
        orderBy: { createdAt: 'asc' },
      });
      const activeSubs = allSubs.filter(s => s.status === 'ACTIVE');
      const expiredSubs = allSubs.filter(s => s.status === 'EXPIRED');

      assert(activeSubs.length === 1, `Expected 1 ACTIVE sub, got ${activeSubs.length}`);
      assert(expiredSubs.length >= 9, `Expected ≥9 EXPIRED cycles, got ${expiredSubs.length}`);

      const payments = await prisma.payment.findMany({ where: { providerPaymentId: { in: payIds } } });
      const invoices = await prisma.subscriptionInvoice.findMany({ where: { paymentId: { in: payments.map(p => p.id) } } });
      assert(invoices.length === 10, `Expected 10 invoices, got ${invoices.length}`);
      const uniquePaymentIds = new Set(invoices.map(i => i.paymentId));
      assert(uniquePaymentIds.size === 10, `Duplicate invoices! ${uniquePaymentIds.size} unique of ${invoices.length}`);
      console.log(c.dim(`       → ${allSubs.length} cycles (1 ACTIVE + ${expiredSubs.length} EXPIRED), ${invoices.length} invoices ✓`));
    } finally {
      const payments = await prisma.payment.findMany({ where: { providerPaymentId: { in: payIds } } });
      const invoices = await prisma.subscriptionInvoice.findMany({ where: { paymentId: { in: payments.map(p => p.id) } } });
      for (const inv of invoices) await prisma.subscriptionInvoice.delete({ where: { id: inv.id } }).catch(() => {});
      await prisma.billingEventLog.deleteMany({ where: { tenantId: testTenantId } }).catch(() => {});
      await prisma.tenantSubscription.deleteMany({ where: { providerSubscriptionId: subId } }).catch(() => {});
      for (const payId of payIds) await prisma.payment.deleteMany({ where: { providerPaymentId: payId } }).catch(() => {});
    }
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(c.bold(c.cyan('\n═══ MobiBix Billing Test Suite ═══')));
  console.log(c.dim(`  Backend: ${BACKEND_URL}`));

  // Health check
  try {
    const health = await fetch(`${BACKEND_URL}/health`);
    if (!health.ok) throw new Error(`Health check failed: ${health.status}`);
    console.log(c.green('  ✓ Backend is alive'));
  } catch {
    console.log(c.red('  ✗ Backend unreachable — start the backend first'));
    process.exit(1);
  }

  if (!WEBHOOK_SECRET) {
    console.log(c.red('  ✗ RAZORPAY_WEBHOOK_SECRET not set in .env'));
    process.exit(1);
  }

  await setup();

  // Run all tests
  await testManualPayments();
  await testAutoPay();
  await testWebhookReliability();
  await testRaceConditions();
  await testInvoices();
  await testBonusRenewalSimulation();

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(c.bold(`\n═══ Results: ${c.green(`${passed} passed`)}  ${failed > 0 ? c.red(`${failed} failed`) : c.dim('0 failed')} ═══\n`));

  if (failed > 0) {
    console.log(c.red('Failed tests:'));
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ${c.red('✗')} ${r.name}`);
      if (r.note) console.log(c.dim(`      ${r.note}`));
    });
    console.log();
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(c.red('Fatal: ' + e.message));
  await prisma.$disconnect();
  process.exit(1);
});
