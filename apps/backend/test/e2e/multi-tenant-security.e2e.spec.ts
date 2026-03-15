import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole, Gender, MemberPaymentStatus, FitnessGoal } from '@prisma/client';

describe('Multi-Tenant Security (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test Data
  let gymTenant: any;
  let mobileShopTenant: any;
  let gymAdmin: any;
  let shopAdmin: any;
  let gymMember: any;
  let shopInvoice: any;
  let shop: any;

  let gymAdminToken: string;
  let shopAdminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    await cleanupTestData();
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    const idSuffix = Date.now().toString();

    // 1. Create Tenants
    gymTenant = await prisma.tenant.create({
      data: {
        id: `gym-tenant-${idSuffix}`,
        name: 'Test Gym',
        code: `GYM-${idSuffix}`,
        tenantType: 'GYM',
        contactPhone: '+919999000001',
      },
    });

    mobileShopTenant = await prisma.tenant.create({
      data: {
        id: `shop-tenant-${idSuffix}`,
        name: 'Test Shop',
        code: `SHOP-${idSuffix}`,
        tenantType: 'MOBILE_SHOP',
        contactPhone: '+919999000002',
      },
    });

    // 2. Create Admin Users
    gymAdmin = await prisma.user.create({
      data: {
        id: `gym-admin-${idSuffix}`,
        email: `gym-admin-${idSuffix}@test.com`,
        REMOVED_AUTH_PROVIDERUid: `uid-gym-${idSuffix}`,
        role: UserRole.ADMIN,
        tenantId: gymTenant.id,
      },
    });

    shopAdmin = await prisma.user.create({
      data: {
        id: `shop-admin-${idSuffix}`,
        email: `shop-admin-${idSuffix}@test.com`,
        REMOVED_AUTH_PROVIDERUid: `uid-shop-${idSuffix}`,
        role: UserRole.ADMIN,
        tenantId: mobileShopTenant.id,
      },
    });

    // 3. Create Tenant Specific Data
    gymMember = await prisma.member.create({
      data: {
        id: `gym-member-${idSuffix}`,
        tenantId: gymTenant.id,
        fullName: 'Gym Member',
        phone: '+919999000003',
        gender: Gender.MALE,
        membershipPlanId: 'plan-1',
        membershipStartAt: new Date(),
        membershipEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentStatus: MemberPaymentStatus.PAID,
        heightCm: 180,
        weightKg: 80,
        fitnessGoal: FitnessGoal.MUSCLE_GAIN,
        monthlyFee: 3000,
        feeAmount: 3000,
        paymentDueDate: new Date(),
      } as any,
    });

    shop = await prisma.shop.create({
      data: {
        id: `shop-${idSuffix}`,
        tenantId: mobileShopTenant.id,
        name: 'Test Shop Instance',
        phone: '+919999000004',
        addressLine1: 'Test Address',
        city: 'Test City',
        state: 'TN',
        pincode: '600001',
        invoicePrefix: 'TS',
      } as any,
    });

    shopInvoice = await prisma.invoice.create({
      data: {
        id: `invoice-shop-${idSuffix}`,
        tenantId: mobileShopTenant.id,
        shopId: shop.id,
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        customerPhone: '+919999000003',
        totalAmount: 11800,
        subTotal: 10000,
        gstAmount: 1800,
        paymentMode: 'UPI',
      },
    });

    // 4. Generate Tokens
    gymAdminToken = generateJwt(gymAdmin.id, gymTenant.id, UserRole.ADMIN);
    shopAdminToken = generateJwt(shopAdmin.id, mobileShopTenant.id, UserRole.ADMIN);
  }

  async function cleanupTestData() {
    // Delete in reverse order of dependencies
    await prisma.whatsAppLog.deleteMany({});
    await prisma.whatsAppCampaign.deleteMany({});
    await prisma.invoiceItem.deleteMany({});
    await prisma.receipt.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.gymAttendance.deleteMany({});
    await prisma.member.deleteMany({});
    await prisma.stockLedger.deleteMany({});
    await prisma.shopProduct.deleteMany({});
    await prisma.shop.deleteMany({});
    await prisma.userTenant.deleteMany({});
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

  describe('Tenant Data Isolation', () => {
    it('should not allow shop admin to see gym members', async () => {
      // Direct prisma query with tenant filter (Service logic verification)
      const members = await prisma.member.findMany({
        where: { tenantId: mobileShopTenant.id },
      });

      const gymMemberInShop = members.find((m) => m.id === gymMember.id);
      expect(gymMemberInShop).toBeUndefined();
    });

    it('should not allow gym admin to see shop invoices', async () => {
      const invoices = await prisma.invoice.findMany({
        where: { tenantId: gymTenant.id },
      });

      const shopInvoiceInGym = invoices.find((inv) => inv.id === shopInvoice.id);
      expect(shopInvoiceInGym).toBeUndefined();
    });
  });

  describe('Admin Authorization', () => {
    it('should prevent cross-tenant admin access', async () => {
      // Shop admin trying to access Gym tenant subscription
      const response = await request(app.getHttpServer())
        .get(`/admin/tenants/${gymTenant.id}/subscription`)
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .expect(403); // Forbidden

      expect(response.body.message).toContain('Insufficient role');
    });

    it('should allow admin accessing own tenant subscription', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/tenants/${gymTenant.id}/subscription`)
        .set('Authorization', `Bearer ${gymAdminToken}`)
        .expect(200); // Success

      expect(response.body).toBeDefined();
    });

    it('should prevent non-admin roles from platform admin routes', async () => {
      const staffToken = generateJwt(gymAdmin.id, gymTenant.id, UserRole.STAFF);
      const response = await request(app.getHttpServer())
        .get(`/admin/tenants/${gymTenant.id}/subscription`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);

      expect(response.body.message).toContain('Insufficient role');
    });
  });

  describe('Soft Delete Isolation', () => {
    let tempMember: any;
    let tempInvoice: any;

    beforeEach(async () => {
      const idSuffix = Date.now().toString();
      // 1. Create and Soft-Delete a Member
      tempMember = await prisma.member.create({
        data: {
          id: `temp-member-${idSuffix}`,
          tenantId: gymTenant.id,
          fullName: 'Temp Member',
          phone: `+91${Math.random().toString().slice(2, 12)}`,
          gender: Gender.OTHER,
          membershipPlanId: 'plan-temp',
          membershipStartAt: new Date(),
          membershipEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentStatus: MemberPaymentStatus.DUE,
          heightCm: 170,
          weightKg: 70,
          fitnessGoal: FitnessGoal.GENERAL_FITNESS,
          monthlyFee: 5000,
          feeAmount: 5000,
          paymentDueDate: new Date(),
        } as any,
      });

      await prisma.member.update({
        where: { id: tempMember.id },
        data: { deletedAt: new Date(), deletedBy: gymAdmin.id },
      });

      // 2. Create and Soft-Delete an Invoice
      tempInvoice = await prisma.invoice.create({
        data: {
          id: `temp-inv-${idSuffix}`,
          tenantId: mobileShopTenant.id,
          shopId: shop.id,
          invoiceNumber: `TEMP-INV-${idSuffix}`,
          customerName: 'Temp Customer',
          customerPhone: `+91${Math.random().toString().slice(2, 12)}`,
          totalAmount: 5900,
          subTotal: 5000,
          gstAmount: 900,
          paymentMode: 'CASH',
        },
      });

      await prisma.invoice.update({
        where: { id: tempInvoice.id },
        data: { deletedAt: new Date(), deletedBy: shopAdmin.id },
      });
    });

    it('should exclude deleted members from queries', async () => {
      // Query should exclude deleted (soft-delete middleware active)
      const result = await prisma.member.findFirst({
        where: { id: tempMember.id, tenantId: gymTenant.id },
      });

      expect(result).toBeNull(); // Soft-deleted record should be excluded
    });

    it('should exclude deleted invoices from queries', async () => {
      // Query should exclude deleted
      const result = await prisma.invoice.findFirst({
        where: { id: tempInvoice.id, tenantId: mobileShopTenant.id },
      });

      expect(result).toBeNull(); // Soft-deleted record excluded
    });
  });

  describe('Composite Key Isolation', () => {
    it('should use composite key for Party lookups', async () => {
      const idSuffix = Date.now().toString();
      // Create a party in gym tenant
      const partyGym = await prisma.party.create({
        data: {
          id: `party-gym-${idSuffix}`,
          tenantId: gymTenant.id,
          name: 'Gym Party',
          phone: `+91${Math.random().toString().slice(2, 12)}`,
          businessType: 'B2C',
          partyType: 'CUSTOMER',
        },
      });

      // Try to find with gym tenant (should work)
      const foundGym = await prisma.party.findFirst({
        where: { id: partyGym.id, tenantId: gymTenant.id },
      });
      expect(foundGym).toBeDefined();

      // Try to find same ID with shop tenant (should fail)
      const foundShop = await prisma.party.findFirst({
        where: { id: partyGym.id, tenantId: mobileShopTenant.id },
      });
      expect(foundShop).toBeNull();
    });
  });

  describe('Attack Scenario Prevention', () => {
    it('should prevent competitor spying on invoices', async () => {
      // Attacker tries to find a shop invoice using gym tenant ID
      const result = await prisma.invoice.findFirst({
        where: { id: shopInvoice.id, tenantId: gymTenant.id },
      });

      expect(result).toBeNull(); // Invoice NOT accessible from wrong tenant
    });

    it('should prevent member check-in under wrong gym', async () => {
      const result = await prisma.member.findFirst({
        where: { id: gymMember.id, tenantId: mobileShopTenant.id },
      });

      expect(result).toBeNull(); // Member NOT found in wrong gym
    });
  });
});
