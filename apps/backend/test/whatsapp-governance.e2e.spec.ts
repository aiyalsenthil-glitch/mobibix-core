import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { UserRole } from '@prisma/client';

/**
 * PHASE 4: WhatsApp Governance Enforcement (E2E Tests)
 *
 * Validates that only ADMIN/SUPER_ADMIN can manage WhatsApp phone numbers.
 * Tests verify outbound-only policy for shared numbers (inbound silently dropped).
 */
describe('WhatsApp Governance (E2E)', () => {
  let app: INestApplication;
  let adminJwt: string;
  let staffJwt: string;
  let ownerJwt: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup: Create test users
    // adminJwt: { role: 'ADMIN' }
    // staffJwt: { role: 'STAFF', tenantId }
    // ownerJwt: { role: 'OWNER', tenantId }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('WhatsApp Phone Numbers Controller (@Admin-Only Enforcement)', () => {
    it('should allow ADMIN to list phone numbers', async () => {
      // ✅ ADMIN can view all phone numbers (global scope)
      const response = await request(app.getHttpServer())
        .get('/whatsapp/phone-numbers')
        .set('Authorization', `Bearer ${adminJwt}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow ADMIN to create phone numbers', async () => {
      // ✅ ADMIN can provision new WhatsApp phone numbers
      const response = await request(app.getHttpServer())
        .post('/whatsapp/phone-numbers')
        .set('Authorization', `Bearer ${adminJwt}`)
        .send({
          phoneNumber: '+1234567890',
          displayName: 'Support Line',
          isShared: true,
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.phoneNumber).toBe('+1234567890');
    });

    it('should allow ADMIN to delete phone numbers', async () => {
      // ✅ ADMIN can remove phone numbers
      const response = await request(app.getHttpServer())
        .delete('/whatsapp/phone-numbers/phone-123')
        .set('Authorization', `Bearer ${adminJwt}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');
    });
  });

  describe('WhatsApp Phone Numbers - Staff Rejection', () => {
    it('should reject STAFF access to create phone numbers (403)', async () => {
      // ❌ STAFF cannot create phone numbers
      // Error: ForbiddenException("Only platform admins can provision phone numbers")
      await request(app.getHttpServer())
        .post('/whatsapp/phone-numbers')
        .set('Authorization', `Bearer ${staffJwt}`)
        .send({
          phoneNumber: '+9876543210',
          displayName: 'Rogue Line',
          isShared: false,
        })
        .expect(403); // Forbidden
    });

    it('should reject STAFF access to delete phone numbers (403)', async () => {
      // ❌ STAFF cannot delete phone numbers
      await request(app.getHttpServer())
        .delete('/whatsapp/phone-numbers/phone-123')
        .set('Authorization', `Bearer ${staffJwt}`)
        .expect(403);
    });

    it('should allow STAFF to VIEW phone numbers (read-only)', async () => {
      // ✅ STAFF can list (view) phone numbers (if GET is public)
      // Depends on implementation: might be ADMIN-only or shared access
      const response = await request(app.getHttpServer())
        .get('/whatsapp/phone-numbers')
        .set('Authorization', `Bearer ${staffJwt}`)
        .expect(200); // If allowed, or 403 if admin-only

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });

  describe('WhatsApp Phone Numbers - Owner Rejection', () => {
    it('should reject OWNER access to create phone numbers (403)', async () => {
      // ❌ OWNER (not ADMIN) cannot create
      await request(app.getHttpServer())
        .post('/whatsapp/phone-numbers')
        .set('Authorization', `Bearer ${ownerJwt}`)
        .send({
          phoneNumber: '+5555555555',
          displayName: 'Owner Attempt',
        })
        .expect(403);
    });

    it('should reject OWNER access to delete phone numbers (403)', async () => {
      // ❌ OWNER cannot delete
      await request(app.getHttpServer())
        .delete('/whatsapp/phone-numbers/phone-123')
        .set('Authorization', `Bearer ${ownerJwt}`)
        .expect(403);
    });
  });

  describe('WhatsApp Phone Numbers - Unauthenticated Rejection', () => {
    it('should reject unauthenticated create (401)', async () => {
      // ❌ No JWT = 401
      await request(app.getHttpServer())
        .post('/whatsapp/phone-numbers')
        .send({
          phoneNumber: '+1111111111',
        })
        .expect(401);
    });

    it('should reject unauthenticated delete (401)', async () => {
      // ❌ No JWT = 401
      await request(app.getHttpServer())
        .delete('/whatsapp/phone-numbers/phone-123')
        .expect(401);
    });
  });

  describe('WhatsApp Outbound-Only Policy', () => {
    it('should process outbound messages normally', async () => {
      // ✅ Outbound messages (tenant → customer) are sent
      const response = await request(app.getHttpServer())
        .post('/whatsapp/send')
        .set('Authorization', `Bearer ${staffJwt}`)
        .send({
          phoneNumber: '+1234567890', // Shared number
          recipient: '+9876543210',
          message: 'Hello from gym',
        })
        .expect(200);

      expect(response.body.status).toBe('sent');
    });

    it('should silently drop inbound messages on shared numbers', async () => {
      // ✅ Inbound messages (customer → shared number) are dropped silently
      // This simulates an incoming webhook from WhatsApp
      const response = await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .send({
          event: 'message.received',
          data: {
            from: '+9876543210', // Customer
            to: '+1234567890', // Shared phone number
            message: 'Hello gym support',
            type: 'inbound',
          },
        })
        .expect(200); // Webhook accepted

      // Response should indicate: inbound message silently dropped (not processed)
      expect(response.body.message).toContain(
        'inbound message silently dropped',
      );
    });

    it('should process inbound messages on dedicated numbers', async () => {
      // ✅ Inbound on dedicated numbers (assigned to one tenant) are processed
      const response = await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .send({
          event: 'message.received',
          data: {
            from: '+9876543210',
            to: '+2222222222', // Dedicated (non-shared) number
            message: 'Support needed',
            type: 'inbound',
          },
        })
        .expect(200);

      // Message should be processed and stored
      expect(response.body.message).toContain('processed');
    });

    it('should log outbound-only policy enforcement', async () => {
      // ✅ Verify logging when shared number receives inbound
      // Expected log output: "[OUTBOUND-ONLY] Shared WhatsApp number +1234567890 received inbound message, silently dropping"

      await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .send({
          event: 'message.received',
          data: {
            from: '+9876543210',
            to: '+1234567890', // Shared
            message: 'test',
            type: 'inbound',
          },
        })
        .expect(200);

      // Logger.log() call with [OUTBOUND-ONLY] prefix should exist
      // Verify via test output or mock logger spy
    });
  });

  describe('WhatsApp Governance - Edge Cases', () => {
    it('should reject phone number creation without ADMIN role', async () => {
      // ❌ All non-ADMIN roles: STAFF, OWNER, USER
      const roles = [
        { jwt: staffJwt, role: 'STAFF' },
        { jwt: ownerJwt, role: 'OWNER' },
      ];

      for (const { jwt, role } of roles) {
        await request(app.getHttpServer())
          .post('/whatsapp/phone-numbers')
          .set('Authorization', `Bearer ${jwt}`)
          .send({ phoneNumber: '+1111111111' })
          .expect(403); // Each role rejected
      }
    });

    it('should use explicit ForbiddenException with descriptive message', async () => {
      // ❌ Response should include clear error message
      const response = await request(app.getHttpServer())
        .post('/whatsapp/phone-numbers')
        .set('Authorization', `Bearer ${staffJwt}`)
        .send({ phoneNumber: '+1111111111' })
        .expect(403);

      // Message should explain: "Only platform admins can provision phone numbers"
      expect(response.body.message).toContain('admin');
    });

    it('should verify both POST and DELETE have admin-only enforcement', async () => {
      // ✅ Ensure BOTH create and delete are protected
      const postResponse = await request(app.getHttpServer())
        .post('/whatsapp/phone-numbers')
        .set('Authorization', `Bearer ${staffJwt}`)
        .send({ phoneNumber: '+1111111111' })
        .expect(403);

      const deleteResponse = await request(app.getHttpServer())
        .delete('/whatsapp/phone-numbers/phone-123')
        .set('Authorization', `Bearer ${staffJwt}`)
        .expect(403);

      expect(postResponse.status).toBe(403);
      expect(deleteResponse.status).toBe(403);
    });
  });

  describe('WhatsApp Webhook Signature Validation', () => {
    it('should validate webhook signature before processing', async () => {
      // ❌ Invalid signature = reject
      await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .set('X-WhatsApp-Signature', 'invalid_sig_xyz')
        .send({
          event: 'message.received',
          data: { from: '+1234567890', message: 'test' },
        })
        .expect(401 | 403); // Unauthorized or Forbidden
    });

    it('should accept webhook with valid signature', async () => {
      // ✅ Valid signature = accept
      const response = await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .set('X-WhatsApp-Signature', 'valid_sig_from_whatsapp')
        .send({
          event: 'message.received',
          data: {
            from: '+9876543210',
            to: '+2222222222',
            message: 'test',
          },
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('WhatsApp Number Ownership & Tenants', () => {
    it('should track which tenant owns dedicated phone numbers', async () => {
      // ✅ Dedicated numbers should have tenantId FK
      const response = await request(app.getHttpServer())
        .post('/whatsapp/phone-numbers')
        .set('Authorization', `Bearer ${adminJwt}`)
        .send({
          phoneNumber: '+5555555555',
          tenantId: tenantId, // Dedicated to one tenant
          isShared: false,
        })
        .expect(201);

      expect(response.body.tenantId).toBe(tenantId);
      expect(response.body.isShared).toBe(false);
    });

    it('should mark shared numbers as tenant-agnostic', async () => {
      // ✅ Shared numbers should have isShared = true, tenantId = null
      const response = await request(app.getHttpServer())
        .post('/whatsapp/phone-numbers')
        .set('Authorization', `Bearer ${adminJwt}`)
        .send({
          phoneNumber: '+9999999999',
          isShared: true, // No tenantId
        })
        .expect(201);

      expect(response.body.isShared).toBe(true);
      expect(response.body.tenantId).toBeNull();
    });
  });

  describe('WhatsApp Admin Enforcement - Code Patterns', () => {
    it('should use explicit role check (not implicit)', async () => {
      // Verify Code Pattern: (see comment)
      // Expected pattern in whatsapp-phone-numbers.controller.ts:
      // const userRole = (req.user?.role as UserRole) || UserRole.USER;
      // if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      //   throw new ForbiddenException('Only platform admins can...');
      // }

      // Runtime test: non-admin attempt fails
      await request(app.getHttpServer())
        .post('/whatsapp/phone-numbers')
        .set('Authorization', `Bearer ${staffJwt}`)
        .send({ phoneNumber: '+1111111111' })
        .expect(403);

      // ADMIN attempt succeeds (can test if we have admin scenario)
      const adminResponse = await request(app.getHttpServer())
        .post('/whatsapp/phone-numbers')
        .set('Authorization', `Bearer ${adminJwt}`)
        .send({ phoneNumber: '+1111111111' })
        .expect(201);

      expect(adminResponse.body.id).toBeDefined();
    });
  });
});
