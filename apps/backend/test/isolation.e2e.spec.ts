// test/isolation.e2e.spec.ts
// Data Isolation Security E2E Tests

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Data Isolation Security (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test data
  let gymA: any, gymB: any;
  let ownerA: any, ownerB: any;
  let staffA: any, staffB: any;
  let memberA1: any, memberA2: any;
  let memberB1: any;
  let tokenOwnerA: string, tokenOwnerB: string;
  let tokenStaffA: string, tokenStaffB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
  });

  beforeEach(async () => {
    // Create two separate gym tenants
    gymA = await prisma.tenant.create({
      data: {
        name: 'Test Gym A',
        code: 'GYM-A-' + Date.now(),
        legalName: 'Gym A Legal',
        contactPhone: '+91-1111111111',
      },
    });

    gymB = await prisma.tenant.create({
      data: {
        name: 'Test Gym B',
        code: 'GYM-B-' + Date.now(),
        legalName: 'Gym B Legal',
        contactPhone: '+91-2222222222',
      },
    });

    // Create owner users for each gym
    ownerA = await prisma.user.create({
      data: {
        REMOVED_AUTH_PROVIDERUid: 'owner-a-' + Date.now(),
        email: `owner-a-${Date.now()}@test.com`,
        fullName: 'Owner A',
      },
    });

    ownerB = await prisma.user.create({
      data: {
        REMOVED_AUTH_PROVIDERUid: 'owner-b-' + Date.now(),
        email: `owner-b-${Date.now()}@test.com`,
        fullName: 'Owner B',
      },
    });

    // Link owners to their gyms
    await prisma.userTenant.create({
      data: {
        userId: ownerA.id,
        tenantId: gymA.id,
        role: 'OWNER',
      },
    });

    await prisma.userTenant.create({
      data: {
        userId: ownerB.id,
        tenantId: gymB.id,
        role: 'OWNER',
      },
    });

    // Create staff for each gym
    staffA = await prisma.user.create({
      data: {
        REMOVED_AUTH_PROVIDERUid: 'staff-a-' + Date.now(),
        email: `staff-a-${Date.now()}@test.com`,
        fullName: 'Staff A',
      },
    });

    staffB = await prisma.user.create({
      data: {
        REMOVED_AUTH_PROVIDERUid: 'staff-b-' + Date.now(),
        email: `staff-b-${Date.now()}@test.com`,
        fullName: 'Staff B',
      },
    });

    // Link staff to their gyms
    await prisma.userTenant.create({
      data: {
        userId: staffA.id,
        tenantId: gymA.id,
        role: 'STAFF',
      },
    });

    await prisma.userTenant.create({
      data: {
        userId: staffB.id,
        tenantId: gymB.id,
        role: 'STAFF',
      },
    });

    // Create members for gym A
    memberA1 = await prisma.member.create({
      data: {
        tenantId: gymA.id,
        fullName: 'Member A1',
        phone: '+91-' + Math.random().toString().slice(2, 12),
        feeAmount: 5000,
        paidAmount: 5000,
        durationCode: 'M1',
        membershipStartAt: new Date(),
        membershipEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    memberA2 = await prisma.member.create({
      data: {
        tenantId: gymA.id,
        fullName: 'Member A2',
        phone: '+91-' + Math.random().toString().slice(2, 12),
        feeAmount: 5000,
        paidAmount: 2500,
        durationCode: 'M1',
        membershipStartAt: new Date(),
        membershipEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create member for gym B
    memberB1 = await prisma.member.create({
      data: {
        tenantId: gymB.id,
        fullName: 'Member B1',
        phone: '+91-' + Math.random().toString().slice(2, 12),
        feeAmount: 6000,
        paidAmount: 6000,
        durationCode: 'M1',
        membershipStartAt: new Date(),
        membershipEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Issue JWT tokens
    tokenOwnerA = jwtService.sign({
      sub: ownerA.id,
      email: ownerA.email,
      tenantId: gymA.id,
      role: 'OWNER',
    });

    tokenOwnerB = jwtService.sign({
      sub: ownerB.id,
      email: ownerB.email,
      tenantId: gymB.id,
      role: 'OWNER',
    });

    tokenStaffA = jwtService.sign({
      sub: staffA.id,
      email: staffA.email,
      tenantId: gymA.id,
      role: 'STAFF',
    });

    tokenStaffB = jwtService.sign({
      sub: staffB.id,
      email: staffB.email,
      tenantId: gymB.id,
      role: 'STAFF',
    });
  });

  afterEach(async () => {
    // Cleanup
    await prisma.member.deleteMany({});
    await prisma.userTenant.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  // =====================================
  // SCENARIO 1: MEMBERS - Cross-Tenant Access
  // =====================================
  describe('Members - Cross-Tenant Access Prevention', () => {
    it('Staff A should NOT see Staff B members in list', async () => {
      const response = await request(app.getHttpServer())
        .get('/members')
        .set('Authorization', `Bearer ${tokenStaffA}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2); // Only A's members
      expect(response.body.data.map((m: any) => m.id)).not.toContain(
        memberB1.id,
      );
    });

    it('Staff A should NOT access Staff B member by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/members/${memberB1.id}`)
        .set('Authorization', `Bearer ${tokenStaffA}`);

      expect(response.status).toBe(400); // Or 403
      expect(response.body).not.toContain(memberB1.fullName);
    });

    it('Staff A should NOT be able to modify Staff B member', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/members/${memberB1.id}`)
        .set('Authorization', `Bearer ${tokenStaffA}`)
        .send({ fullName: 'Hacked Name' });

      expect(response.status).toBe(400); // Or 403
    });

    it('Staff A should NOT be able to delete Staff B member', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/members/${memberB1.id}`)
        .set('Authorization', `Bearer ${tokenStaffA}`);

      expect(response.status).toBe(400); // Or 403

      // Verify member still exists in B's gym
      const member = await prisma.member.findUnique({
        where: { id: memberB1.id },
      });
      expect(member).toBeTruthy();
      expect(member?.deletedAt).toBeNull();
    });

    it('Staff A should NOT see deleted members from own gym in list', async () => {
      // Delete a member
      await prisma.member.update({
        where: { id: memberA1.id },
        data: { deletedAt: new Date(), deletedBy: staffA.id },
      });

      const response = await request(app.getHttpServer())
        .get('/members')
        .set('Authorization', `Bearer ${tokenStaffA}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1); // Only non-deleted
      expect(response.body.data[0].id).toBe(memberA2.id);
    });

    it('Staff A should NOT see deleted member details', async () => {
      // Delete a member
      await prisma.member.update({
        where: { id: memberA1.id },
        data: { deletedAt: new Date(), deletedBy: staffA.id },
      });

      const response = await request(app.getHttpServer())
        .get(`/members/${memberA1.id}`)
        .set('Authorization', `Bearer ${tokenStaffA}`);

      expect(response.status).toBe(400); // Member not found
    });
  });

  // =====================================
  // SCENARIO 2: STAFF - Cross-Tenant Management
  // =====================================
  describe('Staff - Cross-Tenant Management Prevention', () => {
    it('Staff A should NOT access Staff B list', async () => {
      const response = await request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${tokenStaffA}`);

      // Should get forbidden since Staff can't list staff
      expect([403, 401]).toContain(response.status);
    });

    it('Owner A should NOT invite staff to Gym B', async () => {
      const response = await request(app.getHttpServer())
        .post('/staff/invite')
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .send({
          email: 'newstaff@gym.com',
          name: 'New Staff',
          phone: '+91-9999999999',
        });

      expect(response.status).toBe(200); // Invite created for Gym A

      // Verify invite is for Gym A only
      const invites = await prisma.staffInvite.findMany({
        where: { email: 'newstaff@gym.com' },
      });

      expect(invites).toHaveLength(1);
      expect(invites[0].tenantId).toBe(gymA.id);
    });

    it('Owner A should NOT be able to remove Gym B staff', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/staff/${staffB.id}`)
        .set('Authorization', `Bearer ${tokenOwnerA}`);

      expect(response.status).toBe(400); // Or 403

      // Verify staff still exists
      const userTenant = await prisma.userTenant.findFirst({
        where: { userId: staffB.id, tenantId: gymB.id },
      });
      expect(userTenant).toBeTruthy();
      expect(userTenant?.deletedAt).toBeNull();
    });
  });

  // =====================================
  // SCENARIO 3: ROLE-BASED ACCESS CONTROL
  // =====================================
  describe('Role-Based Access Control', () => {
    it('STAFF should NOT be able to create tenant', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenant')
        .set('Authorization', `Bearer ${tokenStaffA}`)
        .send({
          name: 'Hacked Gym',
          legalName: 'Hacked Gym Legal',
          contactPhone: '+91-0000000000',
        });

      expect(response.status).toBe(403); // Forbidden
    });

    it('STAFF should NOT be able to update tenant settings', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tenant/${gymA.id}`)
        .set('Authorization', `Bearer ${tokenStaffA}`)
        .send({ name: 'Updated Gym' });

      expect(response.status).toBe(403); // Forbidden
    });

    it('OWNER should be able to manage their gym', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenant/current')
        .set('Authorization', `Bearer ${tokenOwnerA}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(gymA.id);
    });
  });

  // =====================================
  // SCENARIO 4: TENANT CONTEXT ISOLATION
  // =====================================
  describe('Tenant Context Isolation', () => {
    it('Invalid tenantId in JWT should be rejected', async () => {
      const badToken = jwtService.sign({
        sub: ownerA.id,
        email: ownerA.email,
        tenantId: 'invalid-tenant-id',
        role: 'OWNER',
      });

      const response = await request(app.getHttpServer())
        .get('/tenant/current')
        .set('Authorization', `Bearer ${badToken}`);

      expect(response.status).toBe(400); // Bad request
    });

    it('Expired JWT should be rejected', async () => {
      const expiredToken = jwtService.sign(
        {
          sub: ownerA.id,
          email: ownerA.email,
          tenantId: gymA.id,
          role: 'OWNER',
        },
        { expiresIn: '-1h' }, // Expired
      );

      const response = await request(app.getHttpServer())
        .get('/tenant/current')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401); // Unauthorized
    });

    it('No JWT should be rejected', async () => {
      const response = await request(app.getHttpServer()).get(
        '/tenant/current',
      );

      expect(response.status).toBe(401); // Unauthorized
    });
  });

  // =====================================
  // SCENARIO 5: AUDIT TRAIL ISOLATION
  // =====================================
  describe('Audit Trail Isolation', () => {
    it('Staff A should see their createdBy/updatedBy only', async () => {
      const response = await request(app.getHttpServer())
        .get(`/members/${memberA1.id}`)
        .set('Authorization', `Bearer ${tokenStaffA}`);

      expect(response.status).toBe(200);
      const member = response.body;

      // Audit fields should be present
      expect(member.createdBy).toBeDefined();
      expect(member.createdAt).toBeDefined();

      // Should match staff A (or system user)
      expect(member.createdBy).not.toBe(staffB.id);
    });

    it('Deleted member should have deletedBy from correct tenant', async () => {
      // Delete as Staff A
      await prisma.member.update({
        where: { id: memberA1.id },
        data: { deletedAt: new Date(), deletedBy: staffA.id },
      });

      // Verify Staff B can't see deletion record
      const response = await request(app.getHttpServer())
        .get(`/members/${memberA1.id}`)
        .set('Authorization', `Bearer ${tokenStaffB}`);

      expect(response.status).toBe(400); // Not found
    });
  });

  // =====================================
  // SCENARIO 6: DATA CONSISTENCY
  // =====================================
  describe('Data Consistency Across Isolation', () => {
    it('Member counts should be isolated by tenant', async () => {
      const responseA = await request(app.getHttpServer())
        .get('/members')
        .set('Authorization', `Bearer ${tokenStaffA}`);

      const responseB = await request(app.getHttpServer())
        .get('/members')
        .set('Authorization', `Bearer ${tokenStaffB}`);

      expect(responseA.body.data).toHaveLength(2); // 2 members in A
      expect(responseB.body.data).toHaveLength(1); // 1 member in B
    });

    it('Payment records should be isolated by tenant', async () => {
      const responseA = await request(app.getHttpServer())
        .get(`/members/${memberA1.id}/payments`)
        .set('Authorization', `Bearer ${tokenStaffA}`);

      const responseB = await request(app.getHttpServer())
        .get(`/members/${memberB1.id}/payments`)
        .set('Authorization', `Bearer ${tokenStaffB}`);

      expect(responseA.status).toBe(200);
      expect(responseB.status).toBe(200);

      // Should not be able to cross-tenant access
      const crossTenantResponse = await request(app.getHttpServer())
        .get(`/members/${memberB1.id}/payments`)
        .set('Authorization', `Bearer ${tokenStaffA}`);

      expect(crossTenantResponse.status).toBe(400); // Member not found
    });
  });

  // =====================================
  // SCENARIO 7: CONCURRENT ACCESS
  // =====================================
  describe('Concurrent Access Isolation', () => {
    it('Multiple staff should not see each other data', async () => {
      const [responseA, responseB] = await Promise.all([
        request(app.getHttpServer())
          .get('/members')
          .set('Authorization', `Bearer ${tokenStaffA}`),
        request(app.getHttpServer())
          .get('/members')
          .set('Authorization', `Bearer ${tokenStaffB}`),
      ]);

      expect(responseA.body.data).toHaveLength(2);
      expect(responseB.body.data).toHaveLength(1);

      const aMemberIds = responseA.body.data.map((m: any) => m.id);
      const bMemberIds = responseB.body.data.map((m: any) => m.id);

      // No overlap
      expect(
        aMemberIds.filter((id: string) => bMemberIds.includes(id)),
      ).toHaveLength(0);
    });
  });
});
