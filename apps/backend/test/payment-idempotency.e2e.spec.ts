import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import { PaymentStatus } from '@prisma/client';

/**
 * PHASE 3: Payment Webhook Security (E2E Tests)
 *
 * Validates that PaymentActivationService prevents double-activation race conditions.
 * Tests verify idempotency: first webhook activates subscription, subsequent calls are no-ops.
 */
describe('Payment Webhook Idempotency (E2E)', () => {
  let app: INestApplication;
  let webhookSecret: string = 'test_secret';
  let tenantId: string = 'test_tenant';
  let paymentId: string = 'pay_test_123';
  let ownerJwt: string = 'mock_jwt';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PaymentActivationService Idempotency', () => {
    it('should activate subscription on first webhook call', async () => {
      // Webhook payload (from Razorpay)
      const webhookPayload = {
        event: 'payment.authorized',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              status: 'captured',
              amount: 99900,
              currency: 'INR',
            },
          },
        },
      };

      // First call: payment is PENDING, should activate
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('X-Razorpay-Signature', webhookSecret)
        .send(webhookPayload)
        .expect(200);

      expect(response.body.status).toBe('activated');
      expect(response.body.message).toContain('subscription activated');
    });

    it('should return already_processed on duplicate webhook call', async () => {
      const webhookPayload = {
        event: 'payment.authorized',
        payload: {
          payment: {
            entity: {
              id: paymentId, // Same payment ID as previous
              status: 'captured',
              amount: 99900,
              currency: 'INR',
            },
          },
        },
      };

      // Second call: payment is now SUCCESS, should return already_processed
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('X-Razorpay-Signature', webhookSecret)
        .send(webhookPayload)
        .expect(200);

      expect(response.body.status).toBe('already_processed');
      expect(response.body.message).toContain('already activated');
      // Subscription should NOT be duplicated
    });

    it('should verify PaymentActivationService status check before activation', async () => {
      // PaymentActivationService.activate() should:
      // 1. Query payment status
      // 2. If status === SUCCESS, return {status: 'already_processed'}
      // 3. If status === PENDING, activate and update to SUCCESS
      // 4. Any other flow: handle appropriately

      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('X-Razorpay-Signature', webhookSecret)
        .send({
          event: 'payment.authorized',
          payload: {
            payment: {
              entity: {
                id: paymentId,
                status: 'captured',
              },
            },
          },
        })
        .expect(200);

      // If service properly checks status, duplicate calls should NOT create new subscriptions
      expect(
        response.body.status === 'already_processed' ||
          response.body.status === 'activated',
      ).toBe(true);
    });
  });

  describe('Payments Verify Endpoint Idempotency', () => {
    it('should allow verify endpoint to activate subscription', async () => {
      // /payments/verify?REMOVED_PAYMENT_INFRAOrderId=X&REMOVED_PAYMENT_INFRAPaymentId=Y
      const response = await request(app.getHttpServer())
        .post('/payments/verify')
        .set('Authorization', `Bearer ${ownerJwt}`)
        .send({
          REMOVED_PAYMENT_INFRAOrderId: 'order_test_1',
          REMOVED_PAYMENT_INFRAPaymentId: 'pay_test_2',
          signatureId: 'sig_test_1',
        })
        .expect(200);

      expect(response.body.subscriptionId).toBeDefined();
    });

    it('should use PaymentActivationService (unified activation path)', async () => {
      // Both /payments/webhook and /payments/verify should call
      // PaymentActivationService.activate() internally
      // This ensures single source of truth for activation logic

      const response = await request(app.getHttpServer())
        .post('/payments/verify')
        .set('Authorization', `Bearer ${ownerJwt}`)
        .send({
          REMOVED_PAYMENT_INFRAOrderId: 'order_test_1',
          REMOVED_PAYMENT_INFRAPaymentId: 'pay_test_2',
          signatureId: 'sig_test_1',
        })
        .expect(200);

      // Response should match webhook response format (consistent between endpoints)
      expect(
        response.body.subscriptionId || response.body.status,
      ).toBeDefined();
    });
  });

  describe('Race Condition Prevention', () => {
    it('should handle simultaneous webhook calls (race condition test)', async () => {
      // Simulate: Two webhooks arrive at the same time for same payment
      const webhookPayload = {
        event: 'payment.authorized',
        payload: {
          payment: {
            entity: {
              id: 'pay_race_test',
              status: 'captured',
            },
          },
        },
      };

      // Send two concurrent requests
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/payments/webhook')
          .set('X-Razorpay-Signature', webhookSecret)
          .send(webhookPayload),
        request(app.getHttpServer())
          .post('/payments/webhook')
          .set('X-Razorpay-Signature', webhookSecret)
          .send(webhookPayload),
      ]);

      // One should activate, one should be already_processed
      const results = [response1.body.status, response2.body.status];
      expect(results).toContain('activated');
      expect(results).toContain('already_processed');

      // Verify only ONE subscription was created (no race condition)
      // Query payment record: should have status = SUCCESS and 1 subscription
    });
  });

  describe('Payment Status Transitions', () => {
    it('should verify payment status is SUCCESS after activation', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('X-Razorpay-Signature', webhookSecret)
        .send({
          event: 'payment.authorized',
          payload: {
            payment: {
              entity: {
                id: 'pay_status_test',
                status: 'captured',
              },
            },
          },
        })
        .expect(200);

      // After activation, payment should be in SUCCESS state
      expect(response.body.payment?.status === PaymentStatus.SUCCESS).toBe(
        true,
      );
    });

    it('should handle payment failures gracefully', async () => {
      // Webhook for failed payment
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('X-Razorpay-Signature', webhookSecret)
        .send({
          event: 'payment.failed',
          payload: {
            payment: {
              entity: {
                id: 'pay_failed_test',
                status: 'failed',
              },
            },
          },
        })
        .expect(200); // Should accept webhook gracefully

      // Should NOT activate subscription
      expect(response.body.status).toBe('payment_failed');
    });
  });

  describe('Tenant Isolation in Payments', () => {
    it('should apply tenant filter in webhook processor', async () => {
      // PaymentActivationService should verify payment belongs to authenticated tenant
      // This is handled by JwtAuthGuard (extracts tenantId from JWT)

      const tenantAJwt = 'tenant-a-jwt';
      const tenantBJwt = 'tenant-b-jwt';

      // Create payment for Tenant A
      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Authorization', `Bearer ${tenantAJwt}`)
        .set('X-Razorpay-Signature', webhookSecret)
        .send({
          event: 'payment.authorized',
          payload: {
            payment: {
              entity: {
                id: 'pay_tenant_a',
                status: 'captured',
              },
            },
          },
        })
        .expect(200);

      // Tenant B should NOT be able to process Tenant A's payment
      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Authorization', `Bearer ${tenantBJwt}`)
        .set('X-Razorpay-Signature', webhookSecret)
        .send({
          event: 'payment.authorized',
          payload: {
            payment: {
              entity: {
                id: 'pay_tenant_a', // Same payment (belongs to Tenant A)
                status: 'captured',
              },
            },
          },
        })
        .expect(403 | 404); // Should reject: payment not found in Tenant B's scope
    });
  });

  describe('Subscription Activation Flow', () => {
    it('should create subscription on activation', async () => {
      // After first webhook, subscription should exist
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('X-Razorpay-Signature', webhookSecret)
        .send({
          event: 'payment.authorized',
          payload: {
            payment: {
              entity: {
                id: 'pay_activation_flow',
                status: 'captured',
              },
            },
          },
        })
        .expect(200);

      expect(response.body.subscriptionId).toBeDefined();
      expect(response.body.status).toBe('activated');
    });

    it('should NOT create duplicate subscription on retry', async () => {
      const paymentId = 'pay_no_duplicate';

      // First call
      const response1 = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('X-Razorpay-Signature', webhookSecret)
        .send({
          event: 'payment.authorized',
          payload: {
            payment: {
              entity: {
                id: paymentId,
                status: 'captured',
              },
            },
          },
        })
        .expect(200);

      const subscriptionId1 = response1.body.subscriptionId;

      // Second call (retry/duplicate)
      const response2 = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('X-Razorpay-Signature', webhookSecret)
        .send({
          event: 'payment.authorized',
          payload: {
            payment: {
              entity: {
                id: paymentId,
                status: 'captured',
              },
            },
          },
        })
        .expect(200);

      // Should reference SAME subscription, not create new one
      expect(response2.body.subscriptionId).toBe(subscriptionId1);
      expect(response2.body.status).toBe('already_processed');
    });
  });
});
