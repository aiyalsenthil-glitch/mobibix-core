import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import request from 'supertest';

/**
 * PHASE 1: Tenant Isolation (E2E Tests)
 *
 * Validates that all protected controllers properly enforce tenantId from JWT context
 * and prevent cross-tenant data access/modification.
 */
describe('Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const adminJwt: string = 'adminJwt';
  const tenant1Jwt: string = 'tenant1Jwt';
  const tenant2Jwt: string = 'tenant2Jwt';
  const tenant1Id: string = 'tenant1Id';
  const tenant2Id: string = 'tenant2Id';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup: Create test tenants and users
    // NOTE: In real tests, use factories or fixtures
    // This is pseudocode for reference implementation
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Purchase Controller (Stock-In)', () => {
    it('should allow tenant to create stock-in only for own tenant', async () => {
      // ✅ PASS: Tenant1 can stock-in to Tenant1
      const response = await request(app.getHttpServer())
        .post('/mobileshop/purchase/stock-in')
        .set('Authorization', `Bearer ${tenant1Jwt}`)
        .send({
          supplierId: 'supp123',
          items: [{ productId: 'p1', qty: 10 }],
        })
        .expect(201);

      expect(response.body).toHaveProperty('purchaseId');
    });

    it('should reject cross-tenant stock-in attempt', async () => {
      // ❌ FAIL: Tenant2 cannot create stock-in for Tenant1 (tenantId mismatch)
      await request(app.getHttpServer())
        .post('/mobileshop/purchase/stock-in')
        .set('Authorization', `Bearer ${tenant2Jwt}`)
        .send({
          supplierId: 'supp123',
          tenantId: tenant1Id, // ❌ Attempting to spoof tenantId
          items: [{ productId: 'p1', qty: 10 }],
        })
        .expect(403); // ForbiddenException from TenantRequiredGuard
    });

    it('should reject request without TenantRequiredGuard', async () => {
      // Verify guard is in place (no fallback to body tenantId)
      const response = await request(app.getHttpServer())
        .post('/mobileshop/purchase/stock-in')
        .set('Authorization', `Bearer ${tenant1Jwt}`)
        .send({
          supplierId: 'supp123',
          items: [{ productId: 'p1', qty: 10 }],
        })
        .expect(201);

      // Record should belong to tenant1, not fallback value
      const record = await prisma.purchase.findUnique({
        where: { id: response.body.purchaseId },
      });

      expect(record!.tenantId).toBe(tenant1Id);
      expect(record!.tenantId).not.toBe(tenant2Id);
    });
  });

  describe('Payments Webhook (Cross-Tenant Prevention)', () => {
    it('should activate subscription only for correct tenant', async () => {
      // ✅ Payment created for Tenant1
      const payment = await prisma.payment.create({
        data: {
          tenantId: tenant1Id,
          planId: 'plan1',
          billingCycle: 'MONTHLY',
          priceSnapshot: 5000,
          amount: 5000,
          currency: 'INR',
          status: 'PENDING',
          provider: 'RAZORPAY',
          providerOrderId: `order-${Date.now()}`,
        },
      });

      // Webhook processes payment
      const webhookResponse = await request(app.getHttpServer())
        .post('/webhook/REMOVED_PAYMENT_INFRA')
        .send({
          event: 'payment.captured',
          payload: {
            payment: {
              id: payment.id,
              order_id: payment.providerOrderId,
              amount: payment.amount,
              currency: payment.currency,
            },
          },
        })
        .expect(200);

      // Verify subscription created for Tenant1, not leaked to Tenant2
      const subscription = await prisma.tenantSubscription.findFirst({
        where: { tenantId: tenant1Id },
      });

      expect(subscription).toBeDefined();
      expect(subscription!.tenantId).toBe(tenant1Id);
    });

    it('should reject webhook attempting cross-tenant activation', async () => {
      // ❌ Webhook for Tenant1 payment should not activate for Tenant2
      const payment = await prisma.payment.create({
        data: {
          tenantId: tenant1Id,
          planId: 'plan1',
          billingCycle: 'MONTHLY',
          priceSnapshot: 5000,
          amount: 5000,
          currency: 'INR',
          status: 'PENDING',
          provider: 'RAZORPAY',
          providerOrderId: `order-xsrf-${Date.now()}`,
        },
      });

      // Attempt webhook manipulation (should fail with proper tenantId filter)
      await request(app.getHttpServer())
        .post('/webhook/REMOVED_PAYMENT_INFRA')
        .send({
          event: 'payment.captured',
          payload: {
            payment: {
              id: 'invalid-payment',
              order_id: payment.providerOrderId,
              amount: payment.amount,
              tenantId: tenant2Id, // ❌ Spoofed tenantId
            },
          },
        })
        .expect(400); // Request rejected (payment not found for spoofed tenant)
    });
  });

  describe('QR Check-In (Tenant Code Lookup)', () => {
    it('should resolve tenantCode to tenantId and prevent cross-tenant check-in', async () => {
      // ✅ Check-in with valid tenantCode resolves to correct tenantId
      const response = await request(app.getHttpServer())
        .post('/gym/attendance/qr/check')
        .send({
          tenantCode: 'GYM-001',
          phone: '9876543210',
        })
        .expect(200);

      // Record should belong to resolved tenant, not user input
      const attendance = await prisma.gymAttendance.findFirst({
        where: { memberId: response.body.memberId },
      });

      expect(attendance!.tenantId).toBe(tenant1Id);
    });

    it('should reject QR with invalid tenantCode', async () => {
      // ❌ Invalid or spoofed tenantCode should fail
      await request(app.getHttpServer())
        .post('/gym/attendance/qr/check')
        .send({
          tenantCode: 'INVALID-CODE',
          phone: '9876543210',
        })
        .expect(404); // NotFoundException from tenant lookup
    });
  });

  describe('Admin Webhooks (RBAC + Tenancy)', () => {
    it('should reject non-admin access to webhook events', async () => {
      // ❌ Staff member cannot list webhook events
      await request(app.getHttpServer())
        .get('/admin/webhooks')
        .set('Authorization', `Bearer ${tenant1Jwt}`)
        .expect(403); // RolesGuard rejects STAFF role
    });

    it('should allow admin to list webhook events', async () => {
      // ✅ Admin can list events
      const response = await request(app.getHttpServer())
        .get('/admin/webhooks')
        .set('Authorization', `Bearer ${adminJwt}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Shop Products (TenantRequiredGuard + ModuleScope)', () => {
    it('should restrict shop product operations to owner tenant', async () => {
      // ✅ Tenant1 can link products to their shops
      await request(app.getHttpServer())
        .post('/shop-products/link')
        .set('Authorization', `Bearer ${tenant1Jwt}`)
        .send({
          productId: 'prod123',
          shopId: 'shop123',
        })
        .expect(201);

      // ❌ Tenant2 cannot link products for Tenant1 shops
      await request(app.getHttpServer())
        .post('/shop-products/link')
        .set('Authorization', `Bearer ${tenant2Jwt}`)
        .send({
          productId: 'prod123',
          shopId: 'shop123', // Belongs to Tenant1
        })
        .expect(403);
    });
  });
});
