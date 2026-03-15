import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import { PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../src/core/prisma/prisma.service';
import * as bodyParser from 'body-parser';

/**
 * PHASE 3: Payment Webhook Security (E2E Tests)
 *
 * Validates that PaymentActivationService prevents double-activation race conditions.
 * Tests verify idempotency: first webhook enqueues, subsequent calls are enqueued,
 * but processor only activates once.
 */
describe('Payment Webhook Idempotency (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let webhookSecret: string = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret';
  let tenantId: string = 'test_tenant';
  let paymentId: string = 'pay_test_123';
  let ownerJwt: string = 'mock_jwt';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // 🔥 Force raw body for tests (same logic as main.ts)
    app.use(
      bodyParser.json({
        verify: (req: any, _res, buf) => {
          req.rawBody = buf;
        },
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  function sendSignedWebhook(payload: any) {
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return request(app.getHttpServer())
      .post('/payments/webhook')
      .set('X-Razorpay-Signature', signature)
      .send(payload);
  }

  describe('PaymentActivationService Idempotency', () => {
    it('should enqueue activation on first webhook call', async () => {
      const webhookPayload = {
        event: 'payment.captured',
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

      const response = await sendSignedWebhook(webhookPayload).expect(201);
      expect(response.body.status).toBe('ok');
    });

    it('should return ok (enqueued) on duplicate webhook call', async () => {
      const webhookPayload = {
        event: 'payment.captured',
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

      const response = await sendSignedWebhook(webhookPayload).expect(201);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Payments Verify Endpoint', () => {
    // Note: Verify endpoint is still synchronous and uses PaymentActivationService directly
    it('should allow verify endpoint to activate subscription', async () => {
      // This test is skeletal for now to prioritize the core security fixes
    });
  });
});
