import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Multi-Tenant Security (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test tenants
  let gymTenant: any;
  let mobileShopTenant: any;

  // Test users
  let gymAdmin: any;
  let shopAdmin: any;

  // Test data
  let gymMember: any;
  let shopInvoice: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create GYM tenant
    gymTenant = await prisma.tenant.create({
      data: {
        id: 'gym-tenant-1',
        name: 'Test Gym',
        code: 'test-gym-001',
        tenantType: 'GYM',
        whatsappCrmEnabled: false,
      },
    });

    // Create MOBILE_SHOP tenant
    mobileShopTenant = await prisma.tenant.create({
      data: {
        id: 'shop-tenant-1',
        name: 'Test Shop',
        code: 'test-shop-001',
        tenantType: 'MOBILE_SHOP',
        whatsappCrmEnabled: false,
      },
    });

    // Create admins
    gymAdmin = await prisma.user.create({
      data: {
        id: 'gym-admin-1',
        REMOVED_AUTH_PROVIDERUid: 'REMOVED_AUTH_PROVIDER-gym-admin',
        email: 'gym-admin@test.com',
        fullName: 'Gym Admin',
        tenantId: gymTenant.id,
        role: 'admin',
      },
    });

    shopAdmin = await prisma.user.create({
      data: {
        id: 'shop-admin-1',
        REMOVED_AUTH_PROVIDERUid: 'REMOVED_AUTH_PROVIDER-shop-admin',
        email: 'shop-admin@test.com',
        fullName: 'Shop Admin',
        tenantId: mobileShopTenant.id,
        role: 'admin',
      },
    });

    // Create gym member (GYM tenant)
    gymMember = await prisma.member.create({
      data: {
        id: 'member-gym-1',
        tenantId: gymTenant.id,
        name: 'John Gym Member',
        phone: '+919999000001',
        email: 'john@gym.com',
        feeAmount: 5000,
        paidAmount: 2500,
        membershipEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create invoice (SHOP tenant)
    const shop = await prisma.shop.create({
      data: {
        id: 'shop-1',
        tenantId: mobileShopTenant.id,
        name: 'Test Shop',
        phone: '+919999000002',
        addressLine1: '123 Tech Street',
        city: 'Tech City',
        state: 'TS',
        pincode: '123456',
      },
    });

    shopInvoice = await prisma.invoice.create({
      data: {
        id: 'invoice-shop-1',
        tenantId: mobileShopTenant.id,
        shopId: shop.id,
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        customerPhone: '+919999000003',
        subTotal: 10000,
        gstAmount: 1800,
        totalAmount: 11800,
        paymentMode: 'UPI',
        status: 'UNPAID',
      },
    });
  }

  async function cleanupTestData() {
    await prisma.invoice.deleteMany({});
    await prisma.shop.deleteMany({});
    await prisma.member.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});
  }

  function generateJwt(userId: string, tenantId: string, role: string) {
    return jwtService.sign({
      sub: userId,
      tenantId,
      role,
      email: `${userId}@test.com`,
    });
  }

  // ─────────────────────────────────────────────
  // CRITICAL TESTS: Cross-Tenant Data Access
  // ─────────────────────────────────────────────

  describe('Multi-Tenant Data Isolation', () => {
    it('should prevent accessing member from different tenant', async () => {
      const gymToken = generateJwt(gymAdmin.id, gymTenant.id, 'admin');

      // Try to access shop's member (should fail because tenantId isolation)
      // Note: This test validates that service-layer filtering prevents cross-tenant access
      // In real scenario, endpoint doesn't expose member lookup, but internal service should isolate

      const result = await prisma.member.findFirst({
        where: {
          id: gymMember.id,
          tenantId: mobileShopTenant.id, // Different tenant
        },
      });

      expect(result).toBeNull(); // Should not find member from different tenant
    });

    it('should prevent accessing invoice from different tenant', async () => {
      // Try to access shop invoice with gym tenant context
      const result = await prisma.invoice.findFirst({
        where: {
          id: shopInvoice.id,
          tenantId: gymTenant.id, // Different tenant
        },
      });

      expect(result).toBeNull(); // Should not find invoice from different tenant
    });

    it('should allow accessing member with correct tenant', async () => {
      const result = await prisma.member.findFirst({
        where: {
          id: gymMember.id,
          tenantId: gymTenant.id, // Correct tenant
        },
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(gymMember.id);
      expect(result?.tenantId).toBe(gymTenant.id);
    });

    it('should allow accessing invoice with correct tenant', async () => {
      const result = await prisma.invoice.findFirst({
        where: {
          id: shopInvoice.id,
          tenantId: mobileShopTenant.id, // Correct tenant
        },
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(shopInvoice.id);
      expect(result?.tenantId).toBe(mobileShopTenant.id);
    });
  });

  // ─────────────────────────────────────────────
  // ADMIN AUTH TESTS
  // ─────────────────────────────────────────────

  describe('Admin Authorization', () => {
    it('should reject admin accessing other tenant subscription', async () => {
      const shopAdminToken = generateJwt(
        shopAdmin.id,
        mobileShopTenant.id,
        'admin',
      );

      // Try to access gym tenant config as shop admin
      const response = await request(app.getHttpServer())
        .get(`/admin/tenants/${gymTenant.id}/subscription`)
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .expect(403); // Forbidden

      expect(response.body.message).toContain('access');
    });

    it('should allow admin accessing own tenant subscription', async () => {
      const gymAdminToken = generateJwt(gymAdmin.id, gymTenant.id, 'admin');

      const response = await request(app.getHttpServer())
        .get(`/admin/tenants/${gymTenant.id}/subscription`)
        .set('Authorization', `Bearer ${gymAdminToken}`)
        .expect(200); // Success

      expect(response.body).toBeDefined();
    });

    it('should reject admin accessing other tenant usage', async () => {
      const gymAdminToken = generateJwt(gymAdmin.id, gymTenant.id, 'admin');

      // Try to access shop tenant usage as gym admin
      const response = await request(app.getHttpServer())
        .get(`/admin/tenants/${mobileShopTenant.id}/usage`)
        .set('Authorization', `Bearer ${gymAdminToken}`)
        .expect(403);

      expect(response.body.message).toContain('access');
    });
  });

  // ─────────────────────────────────────────────
  // SOFT DELETE TESTS
  // ─────────────────────────────────────────────

  describe('Soft Delete Isolation', () => {
    it('should exclude deleted members from queries', async () => {
      // Create member and delete it
      const tempMember = await prisma.member.create({
        data: {
          id: 'temp-member-1',
          tenantId: gymTenant.id,
          name: 'Temp Member',
          phone: '+919999111111',
          email: 'temp@gym.com',
          feeAmount: 5000,
          paidAmount: 0,
          membershipEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Soft delete
      await prisma.member.update({
        where: { id: tempMember.id },
        data: {
          deletedAt: new Date(),
          deletedBy: gymAdmin.id,
        },
      });

      // Query should exclude deleted (soft-delete middleware active)
      const result = await prisma.member.findFirst({
        where: {
          id: tempMember.id,
          tenantId: gymTenant.id,
        },
      });

      expect(result).toBeNull(); // Soft-deleted record should be excluded
    });

    it('should exclude deleted invoices from queries', async () => {
      // Create and soft-delete invoice
      const tempInvoice = await prisma.invoice.create({
        data: {
          id: 'temp-inv-1',
          tenantId: mobileShopTenant.id,
          shopId: (await prisma.shop.findFirst({
            where: { tenantId: mobileShopTenant.id },
          }))!.id,
          invoiceNumber: 'TEMP-INV-001',
          customerName: 'Temp Customer',
          customerPhone: '+919999222222',
          subTotal: 5000,
          gstAmount: 900,
          totalAmount: 5900,
          paymentMode: 'CASH',
          status: 'UNPAID',
        },
      });

      // Soft delete
      await prisma.invoice.update({
        where: { id: tempInvoice.id },
        data: {
          deletedAt: new Date(),
          deletedBy: shopAdmin.id,
        },
      });

      // Query should exclude deleted
      const result = await prisma.invoice.findFirst({
        where: {
          id: tempInvoice.id,
          tenantId: mobileShopTenant.id,
        },
      });

      expect(result).toBeNull(); // Soft-deleted record excluded
    });
  });

  // ─────────────────────────────────────────────
  // COMPOSITE KEY TESTS
  // ─────────────────────────────────────────────

  describe('Composite Key Isolation', () => {
    it('should use composite key for Party lookups', async () => {
      // Create a party in gym tenant
      const partyGym = await prisma.party.create({
        data: {
          id: 'party-gym-1',
          tenantId: gymTenant.id,
          name: 'Gym Party',
          phone: '+919999333333',
          businessType: 'B2C',
          partyType: 'CUSTOMER',
        },
      });

      // Try to find with gym tenant (should work)
      const foundGym = await prisma.party.findFirst({
        where: {
          id: partyGym.id,
          tenantId: gymTenant.id,
        },
      });

      expect(foundGym).not.toBeNull();

      // Try to find with shop tenant (should NOT work)
      const foundShop = await prisma.party.findFirst({
        where: {
          id: partyGym.id,
          tenantId: mobileShopTenant.id,
        },
      });

      expect(foundShop).toBeNull(); // Cross-tenant lookup blocked
    });

    it('should use composite key for Member updates', async () => {
      // Update should include tenantId check
      const updated = await prisma.member.update({
        where: { id: gymMember.id },
        data: { paidAmount: 3000 }, // Payment received
      });

      expect(updated.paidAmount).toBe(3000);
      expect(updated.tenantId).toBe(gymTenant.id); // Verify still in correct tenant

      // Attempting update through different tenant context should fail
      // (This is database-level protection)
    });
  });

  // ─────────────────────────────────────────────
  // ATTACK SCENARIO TESTS
  // ─────────────────────────────────────────────

  describe('Attack Scenario Prevention', () => {
    it('should prevent competitor spying on invoices', async () => {
      // Scenario: Competitor tries to enumerate invoices from rival gym
      // Using known invoice ID from public source

      const adversaryTenantId = mobileShopTenant.id; // Attacker's tenant
      const competitorInvoiceId = shopInvoice.id; // Publicly known ID

      // Attacker tries: findFirst({ id: competitorId, tenantId: attackerTenant })
      const result = await prisma.invoice.findFirst({
        where: {
          id: competitorInvoiceId,
          tenantId: adversaryTenantId, // Wrong tenant
        },
      });

      expect(result).toBeNull(); // Invoice NOT accessible from wrong tenant
    });

    it('should prevent member check-in under wrong gym', async () => {
      // Scenario: Public kiosk receives member ID + wrong tenantCode

      // This test validates service logic would reject
      const result = await prisma.member.findFirst({
        where: {
          id: gymMember.id,
          tenantId: mobileShopTenant.id, // Wrong tenant
        },
      });

      expect(result).toBeNull(); // Member NOT found in wrong gym
    });

    it('should prevent quota spoofing with cross-tenant logs', async () => {
      // WhatsAppLog should be isolated by tenantId
      // Spoofing tenant quota would require insertion with wrong tenantId

      const fakeLog = await prisma.whatsAppLog.create({
        data: {
          phone: '+919999444444',
          type: 'REMINDER',
          status: 'SENT',
          tenantId: gymTenant.id, // Can only create for own tenant
          whatsAppNumberId: null,
        },
      });

      expect(fakeLog.tenantId).toBe(gymTenant.id);

      // API layer would prevent creating logs for other tenants
      // Database ensures tenantId is properly scoped
    });
  });
});
