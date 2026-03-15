// Load .env BEFORE any NestJS imports — PrismaService reads DATABASE_URL
// in its constructor (runs before ConfigModule.forRoot), so it must be
// present in process.env before the module compilation step.
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BillingCycle,
  ModuleType,
  UserRole,
  AutopayStatus,
  BillingType,
} from '@prisma/client';

/**
 * Billing Webhook Edge Cases (E2E)
 *
 * Tests three scenarios identified in the 2026-03-03 billing audit:
 *   1. subscription.halted  → status must be set to PAST_DUE (Fix 1)
 *   2. Delayed subscription.charged on EXPIRED sub → EXPIRED resurrection (Fix 2)
 *   3. Duplicate subscription.charged → idempotent (Fix 2)
 *   4. subscription.cancelled → autoRenew=false, skips EXPIRED rows (Fix 1b)
 *
 * Strategy: Inject jobs directly into BullMQ (bypasses HMAC validation),
 * mirroring exactly what production does after webhook signature check.
 */

const suffix = () => `${Date.now()}-${Math.floor(Math.random() * 9999)}`;

describe('Billing Webhook Edge Cases (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let webhookQueue: Queue;

  // Track created IDs for cleanup
  const createdTenantIds: string[] = [];
  const createdPlanIds: string[] = [];
  const createdUserIds: string[] = [];

  // ─── Seed Helpers ─────────────────────────────────────────────────────────

  async function seedTenantAndPlan() {
    const plan = await prisma.plan.create({
      data: {
        code: `TEST-PLAN-${suffix()}`,
        name: `Test Plan ${suffix()}`,
        level: 1,
        module: ModuleType.GYM,
        isActive: true,
      },
      select: { id: true },
    });
    createdPlanIds.push(plan.id);

    const tenant = await prisma.tenant.create({
      data: {
        name: `Test Tenant ${suffix()}`,
        code: `TTEST-${suffix()}`,
        tenantType: 'GYM',
      },
      select: { id: true },
    });
    createdTenantIds.push(tenant.id);

    return { tenantId: tenant.id, planId: plan.id };
  }

  async function seedSubscription(overrides: Record<string, any> = {}) {
    const { tenantId, planId } = await seedTenantAndPlan();

    const sub = await prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId,
        module: ModuleType.GYM,
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate:   new Date(Date.now() + 1  * 24 * 60 * 60 * 1000),
        billingCycle: BillingCycle.MONTHLY,
        priceSnapshot: 99900,
        autopayStatus: AutopayStatus.ACTIVE,
        autoRenew: true,
        billingType: BillingType.AUTOPAY,
        providerSubscriptionId: `sub_test_${suffix()}`,
        ...overrides,
      },
    });

    return sub;
  }

  /** Enqueue a BullMQ job and wait for the worker to process it */
  async function processWebhookJob(event: string, payload: any) {
    await webhookQueue.add(
      'process-webhook',
      { event, eventId: `test_evt_${suffix()}`, payload },
      { attempts: 1, removeOnComplete: false },
    );
    // Give the worker time to process (BullMQ worker is active in AppModule)
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }

  // ─── Setup / Teardown ─────────────────────────────────────────────────────

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma     = app.get(PrismaService);
    webhookQueue = app.get(getQueueToken('REMOVED_PAYMENT_INFRA-webhooks'));
  }, 30_000);

  afterAll(async () => {
    // Clean up in dependency order: event logs → subscriptions → payments → plans → tenants
    // Use $executeRaw to avoid dependency on stale Prisma generated client
    if (createdTenantIds.length > 0) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "BillingEventLog" WHERE "tenantId" = ANY($1::text[])`,
        createdTenantIds,
      ).catch(() => {});
    }
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: { in: createdTenantIds } },
    }).catch(() => {});
    await prisma.payment.deleteMany({
      where: { tenantId: { in: createdTenantIds } },
    }).catch(() => {});
    await prisma.plan.deleteMany({ where: { id: { in: createdPlanIds } } }).catch(() => {});
    await prisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } }).catch(() => {});
    await app.close();
  }, 30_000);

  // ─── Test 1 — subscription.halted → PAST_DUE ──────────────────────────────

  describe('Fix 1: subscription.halted must set status to PAST_DUE', () => {
    it('should set status=PAST_DUE and autopayStatus=HALTED when subscription is halted', async () => {
      const sub = await seedSubscription({ status: 'ACTIVE', autopayStatus: AutopayStatus.ACTIVE });

      await processWebhookJob('subscription.halted', {
        subscription: { entity: { id: sub.providerSubscriptionId } },
      });

      const updated = await prisma.tenantSubscription.findUnique({ where: { id: sub.id } });
      expect(updated?.status).toBe('PAST_DUE');
      expect(updated?.autopayStatus).toBe('HALTED');
      expect(updated?.paymentStatus).toBe('FAILED');
    }, 15_000);

    it('should create a BillingEventLog entry for the halted event', async () => {
      const sub = await seedSubscription({ status: 'ACTIVE', autopayStatus: AutopayStatus.ACTIVE });

      await processWebhookJob('subscription.halted', {
        subscription: { entity: { id: sub.providerSubscriptionId } },
      });

      // Audit log check via raw query (Prisma client may be stale re: BillingEventLog)
      const rows = await prisma.$queryRaw<any[]>`
        SELECT "statusAfter" FROM "BillingEventLog"
        WHERE "tenantId" = ${sub.tenantId}
          AND "eventType" = 'subscription.halted'
          AND "providerReferenceId" = ${sub.providerSubscriptionId!}
        LIMIT 1
      `;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].statusAfter).toBe('PAST_DUE');
    }, 15_000);
  });

  // ─── Test 2 — EXPIRED Resurrection ────────────────────────────────────────

  describe('Fix 2: Delayed subscription.charged on EXPIRED sub (resurrection)', () => {
    it('should create a new ACTIVE subscription when charged event arrives for EXPIRED+autopay-ACTIVE sub', async () => {
      const sub = await seedSubscription({
        status: 'EXPIRED',
        autopayStatus: AutopayStatus.ACTIVE,
        endDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
      });

      const REMOVED_PAYMENT_INFRAPaymentId = `pay_resurrection_${suffix()}`;
      await processWebhookJob('subscription.charged', {
        subscription: {
          entity: {
            id: sub.providerSubscriptionId,
            current_start: Math.floor(Date.now() / 1000),
            current_end:   Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          },
        },
        payment: {
          entity: {
            id: REMOVED_PAYMENT_INFRAPaymentId,
            amount: 99900,
            currency: 'INR',
            status: 'captured',
            order_id: `order_resurrection_${suffix()}`,
          },
        },
      });

      // The row should be updated to ACTIVE in-place (because of unique constraint on tenant+module)
      const newSub = await prisma.tenantSubscription.findUnique({
        where: { id: sub.id },
      });

      expect(newSub).not.toBeNull();
      expect(newSub?.status).toBe('ACTIVE');
      expect(newSub?.paymentStatus).toBe('SUCCESS');
      expect(newSub?.autoRenew).toBe(true);
    }, 20_000);

    it('should NOT create a new sub for a CANCELLED subscription on a late charged event', async () => {
      const sub = await seedSubscription({
        status: 'CANCELLED',
        autopayStatus: AutopayStatus.CANCELLED,
      });

      const countBefore = await prisma.tenantSubscription.count({ where: { tenantId: sub.tenantId } });

      await processWebhookJob('subscription.charged', {
        subscription: { entity: { id: sub.providerSubscriptionId } },
        payment: {
          entity: {
            id: `pay_cancelled_skip_${suffix()}`,
            amount: 99900,
            currency: 'INR',
            status: 'captured',
          },
        },
      });

      const countAfter = await prisma.tenantSubscription.count({ where: { tenantId: sub.tenantId } });
      expect(countAfter).toBe(countBefore);
    }, 15_000);
  });

  // ─── Test 3 — Duplicate charged → Idempotent ──────────────────────────────

  describe('Fix 2: Duplicate subscription.charged is idempotent', () => {
    it('should create exactly 1 Payment row and ≤1 ACTIVE sub on duplicate charged events', async () => {
      const sub = await seedSubscription({ status: 'ACTIVE' });
      const paymentId = `pay_idempotency_${suffix()}`;

      const chargedPayload = {
        subscription: {
          entity: {
            id: sub.providerSubscriptionId,
            current_start: Math.floor(Date.now() / 1000),
            current_end:   Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          },
        },
        payment: {
          entity: {
            id: paymentId,
            amount: 99900,
            currency: 'INR',
            status: 'captured',
            order_id: `order_idempotency_${suffix()}`,
          },
        },
      };

      // First delivery
      await processWebhookJob('subscription.charged', chargedPayload);
      // Duplicate delivery (same paymentId)
      await processWebhookJob('subscription.charged', chargedPayload);

      // Exactly 1 Payment record
      const payments = await prisma.payment.findMany({ where: { providerPaymentId: paymentId } });
      expect(payments.length).toBe(1);

      // Auditor's golden rule: never > 1 ACTIVE sub per tenant
      const activeSubs = await prisma.tenantSubscription.findMany({
        where: { tenantId: sub.tenantId, status: 'ACTIVE' },
      });
      expect(activeSubs.length).toBeLessThanOrEqual(1);
    }, 25_000);
  });

  // ─── Test 4 — subscription.cancelled → correct flags ──────────────────────

  describe('Fix 1b: subscription.cancelled sets autoRenew=false and skips EXPIRED rows', () => {
    it('should set autoRenew=false when subscription is cancelled from dashboard', async () => {
      const sub = await seedSubscription({
        status: 'ACTIVE',
        autopayStatus: AutopayStatus.ACTIVE,
        autoRenew: true,
      });

      await processWebhookJob('subscription.cancelled', {
        subscription: { entity: { id: sub.providerSubscriptionId } },
      });

      const updated = await prisma.tenantSubscription.findUnique({ where: { id: sub.id } });
      expect(updated?.status).toBe('CANCELLED');
      expect(updated?.autopayStatus).toBe('CANCELLED');
      expect(updated?.autoRenew).toBe(false);
    }, 15_000);

    it('should NOT update EXPIRED historical rows to CANCELLED', async () => {
      // Two tenants, same providerSubscriptionId — simulates prior-cycle row
      const provSubId = `sub_historical_${suffix()}`;

      const historicalSub = await seedSubscription({
        status: 'EXPIRED',
        autopayStatus: null,
        providerSubscriptionId: provSubId,
      });

      const activeSub = await seedSubscription({
        status: 'ACTIVE',
        autopayStatus: AutopayStatus.ACTIVE,
        providerSubscriptionId: provSubId,
        // Note: different tenantId because seedSubscription creates a new tenant
        // This correctly simulates the multi-row scenario for the same Razorpay sub
      });

      await processWebhookJob('subscription.cancelled', {
        subscription: { entity: { id: provSubId } },
      });

      const historical = await prisma.tenantSubscription.findUnique({ where: { id: historicalSub.id } });
      expect(historical?.status).toBe('EXPIRED'); // must NOT become CANCELLED

      const active = await prisma.tenantSubscription.findUnique({ where: { id: activeSub.id } });
      expect(active?.status).toBe('CANCELLED'); // must be CANCELLED
    }, 15_000);
  });
});
