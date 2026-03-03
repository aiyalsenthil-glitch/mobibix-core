import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  IMEIStatus,
  ProductType,
  InvoiceStatus,
  PaymentMode,
  PartyType,
  ModuleType,
} from '@prisma/client';

jest.setTimeout(30000);

describe('Invoice Engine Chaos Destruction Test (Phase 5 Hardening)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const tenantIds: string[] = [];
  const userIds: string[] = [];
  const planIds: string[] = [];

  // Per-test variables
  let tenantA: any;
  let shopA: any;
  let ownerA: any;
  let tokenA: string;
  let productA: any; // Accessory (Non-serialized)
  let productB: any; // Phone (Serialized)
  let customerA: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
  });

  beforeEach(async () => {
    // 1. Setup Tenant
    tenantA = await prisma.tenant.create({
      data: {
        name: 'Chaos Tenant',
        code: 'CHAOS-' + Math.random().toString(36).substring(7),
        legalName: 'Chaos Corp',
        contactPhone: '+91-0000000000',
        tenantType: 'MOBILE_SHOP',
      },
    });
    tenantIds.push(tenantA.id);

    // 2. Setup Plan & Subscription (Required by SubscriptionGuard)
    const plan = await prisma.plan.create({
      data: {
        code: 'PLAN-' + tenantA.id,
        name: 'Chaos Plan ' + tenantA.id,
        level: 1,
        module: ModuleType.MOBILE_SHOP,
        isActive: true,
      },
    });
    planIds.push(plan.id);

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantA.id,
        planId: plan.id,
        module: ModuleType.MOBILE_SHOP,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 3. Setup Shop
    shopA = await prisma.shop.create({
      data: {
        tenantId: tenantA.id,
        name: 'Chaos Shop',
        state: 'Tamil Nadu',
        gstEnabled: true,
        gstNumber: '33AABCC1234D1Z5',
        phone: '0000000000',
        addressLine1: 'Chaos Street',
        city: 'Chaos City',
        pincode: '600001',
        invoicePrefix: 'INV',
      },
    });

    // 4. Setup Owner
    ownerA = await prisma.user.create({
      data: {
        REMOVED_AUTH_PROVIDERUid: 'chaos-user-' + Math.random().toString(36).substring(7),
        email: `chaos-${Date.now()}@test.com`,
        fullName: 'Chaos Master',
        role: 'OWNER',
      },
    });
    userIds.push(ownerA.id);

    await prisma.userTenant.create({
      data: {
        userId: ownerA.id,
        tenantId: tenantA.id,
        role: 'OWNER',
      },
    });

    tokenA = jwtService.sign({
      sub: ownerA.id,
      email: ownerA.email,
      tenantId: tenantA.id,
      role: 'OWNER',
    });

    // 5. Setup Customer
    customerA = await prisma.party.create({
      data: {
        tenantId: tenantA.id,
        name: 'Target Customer',
        phone: '9999999999',
        partyType: PartyType.CUSTOMER,
        state: 'Tamil Nadu',
      },
    });

    // 6. Setup Products
    productA = await prisma.shopProduct.create({
      data: {
        tenantId: tenantA.id,
        shopId: shopA.id,
        name: 'Chaos Accessory',
        type: ProductType.GOODS,
        isSerialized: false,
        hsnCode: '8517',
        salePrice: 100, // Rupees
        costPrice: 50,
        isActive: true,
      },
    });

    productB = await prisma.shopProduct.create({
      data: {
        tenantId: tenantA.id,
        shopId: shopA.id,
        name: 'Chaos Phone',
        type: ProductType.GOODS,
        isSerialized: true,
        hsnCode: '8517',
        salePrice: 10000,
        costPrice: 8000,
        isActive: true,
      },
    });
  }, 30000);

  afterAll(async () => {
    // Bulk cleanup
    for (const tid of tenantIds) {
      try {
        await prisma.iMEI.deleteMany({ where: { tenantId: tid } });
        await prisma.invoiceItem.deleteMany({
          where: { invoice: { tenantId: tid } },
        });
        await prisma.invoice.deleteMany({ where: { tenantId: tid } });
        await prisma.stockLedger.deleteMany({ where: { tenantId: tid } });
        await prisma.shopProduct.deleteMany({ where: { tenantId: tid } });
        await prisma.shop.deleteMany({ where: { tenantId: tid } });
        await prisma.userTenant.deleteMany({ where: { tenantId: tid } });
        await prisma.party.deleteMany({ where: { tenantId: tid } });
        await prisma.tenantSubscription.deleteMany({
          where: { tenantId: tid },
        });
        await prisma.tenant.delete({ where: { id: tid } });
      } catch (e) {}
    }
    for (const pid of planIds) {
      try {
        await prisma.plan.delete({ where: { id: pid } });
      } catch (e) {}
    }
    for (const uid of userIds) {
      try {
        await prisma.user.delete({ where: { id: uid } });
      } catch (e) {}
    }
    await app.close();
  }, 30000);

  it('Should rollback entire transaction if one step fails (ACID TEST)', async () => {
    const imeiCode = 'IMEI-CRASH-' + Date.now();
    await prisma.iMEI.create({
      data: {
        tenantId: tenantA.id,
        shopProductId: productB.id,
        imei: imeiCode,
        status: IMEIStatus.IN_STOCK,
      },
    });

    const badPayload = {
      shopId: shopA.id,
      customerId: customerA.id,
      customerName: customerA.name,
      customerPhone: customerA.phone,
      paymentMode: 'CASH',
      items: [
        {
          shopProductId: productB.id,
          quantity: 2,
          rate: 100,
          gstRate: 18,
          imeis: [imeiCode], // Only 1 IMEI for qty 2 -> fails validation
        },
      ],
    };

    const response = await request(app.getHttpServer())
      .post('/api/mobileshop/sales/invoice')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(badPayload);

    expect(response.status).toBe(400);

    const imei = await prisma.iMEI.findUnique({
      where: {
        tenantId_imei: {
          tenantId: tenantA.id,
          imei: imeiCode,
        },
      },
    });
    expect(imei?.status).toBe(IMEIStatus.IN_STOCK);
    expect(imei?.invoiceId).toBeNull();
  });

  it('Should prevent double-selling the same IMEI under extreme concurrency (RACE TEST)', async () => {
    const imeiCode = 'IMEI-RACE-' + Date.now();
    await prisma.iMEI.create({
      data: {
        tenantId: tenantA.id,
        shopProductId: productB.id,
        imei: imeiCode,
        status: IMEIStatus.IN_STOCK,
      },
    });

    const payload = {
      shopId: shopA.id,
      customerId: customerA.id,
      customerName: customerA.name,
      customerPhone: customerA.phone,
      paymentMode: 'CASH',
      items: [
        {
          shopProductId: productB.id,
          quantity: 1,
          rate: 10000,
          gstRate: 18,
          imeis: [imeiCode],
        },
      ],
    };

    const results = await Promise.all([
      request(app.getHttpServer())
        .post('/api/mobileshop/sales/invoice')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(payload),
      request(app.getHttpServer())
        .post('/api/mobileshop/sales/invoice')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(payload),
      request(app.getHttpServer())
        .post('/api/mobileshop/sales/invoice')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(payload),
    ]);

    const successCount = results.filter((r) => r.status === 201).length;
    if (successCount !== 1) {
      console.log(
        'RACE TEST FAILED:',
        results.map((r) => ({ status: r.status, body: r.body })),
      );
    }
    expect(successCount).toBe(1);

    const invoices = await prisma.invoice.findMany({
      where: { tenantId: tenantA.id, status: { not: 'VOIDED' } },
    });
    expect(invoices).toHaveLength(1);
  });

  it('Should block negative stock even with 10 concurrent requests (STOCK STORM)', async () => {
    await prisma.stockLedger.create({
      data: {
        tenantId: tenantA.id,
        shopId: shopA.id,
        shopProductId: productA.id,
        quantity: 5,
        type: 'IN',
        referenceType: 'ADJUSTMENT',
      },
    });

    await prisma.shopProduct.update({
      where: { id: productA.id },
      data: { quantity: 5 },
    });

    const payload = {
      shopId: shopA.id,
      customerId: customerA.id,
      customerName: customerA.name,
      customerPhone: customerA.phone,
      paymentMode: 'CASH',
      items: [
        {
          shopProductId: productA.id,
          quantity: 1,
          rate: 100,
          gstRate: 18,
        },
      ],
    };

    const results = await Promise.all(
      Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/api/mobileshop/sales/invoice')
            .set('Authorization', `Bearer ${tokenA}`)
            .send(payload),
        ),
    );

    const successCount = results.filter((r) => r.status === 201).length;
    if (successCount !== 5) {
      console.log(
        'STOCK STORM FAILED:',
        results.map((r) => ({ status: r.status, body: r.body })),
      );
    }
    expect(successCount).toBe(5);

    const aggregates = await prisma.stockLedger.groupBy({
      by: ['type'],
      where: { shopProductId: productA.id },
      _sum: { quantity: true },
    });

    const qtyIn = aggregates.find((a) => a.type === 'IN')?._sum?.quantity || 0;
    const qtyOut =
      aggregates.find((a) => a.type === 'OUT')?._sum?.quantity || 0;

    expect(Number(qtyIn) - Number(qtyOut)).toBe(0);
  });

  it('Should ignore malicious warrantyEndAt and compute internally (WARRANTY ATTACK)', async () => {
    // Inject sufficient stock for productA
    await prisma.stockLedger.create({
      data: {
        tenantId: tenantA.id,
        shopId: shopA.id,
        shopProductId: productA.id,
        quantity: 10,
        type: 'IN',
        referenceType: 'ADJUSTMENT',
      },
    });

    await prisma.shopProduct.update({
      where: { id: productA.id },
      data: { quantity: 10 },
    });
    const maliciousPayload = {
      shopId: shopA.id,
      customerId: customerA.id,
      customerName: customerA.name,
      customerPhone: customerA.phone,
      items: [
        {
          shopProductId: productA.id,
          quantity: 1,
          rate: 100,
          gstRate: 18,
          warrantyDays: 365,
          warrantyEndAt: '2099-01-01',
        },
      ],
      paymentMode: 'CASH',
    };

    const response = await request(app.getHttpServer())
      .post('/api/mobileshop/sales/invoice')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(maliciousPayload);

    if (response.status !== 201) {
      console.log('WARRANTY ATTACK FAILED:', response.body);
    }
    expect(response.status).toBe(201);

    const invoiceId = response.body.id;
    const item = await prisma.invoiceItem.findFirst({
      where: { invoiceId },
    });

    const expectedEnd = new Date();
    expectedEnd.setDate(expectedEnd.getDate() + 365);

    const actualEnd = new Date(item!.warrantyEndAt!);
    expect(actualEnd.getFullYear()).toBe(expectedEnd.getFullYear());
    expect(actualEnd.getFullYear()).not.toBe(2099);
  });

  it('Should block cross-tenant product injection (MULTI-TENANT ATTACK)', async () => {
    // 1. Create Tenant B and a product
    const tenantB = await prisma.tenant.create({
      data: {
        name: 'Victim Tenant',
        code: 'VICTIM-' + Math.random().toString(36).substring(7),
        tenantType: 'MOBILE_SHOP',
      },
    });
    tenantIds.push(tenantB.id);

    const shopB = await prisma.shop.create({
      data: {
        tenantId: tenantB.id,
        name: 'Victim Shop',
        state: 'Tamil Nadu',
        phone: '1111111111',
        addressLine1: 'Victim Street',
        city: 'Victim City',
        pincode: '600001',
        invoicePrefix: 'VIC',
      },
    });

    const productB_Other = await prisma.shopProduct.create({
      data: {
        tenantId: tenantB.id,
        shopId: shopB.id,
        name: 'Victim Phone',
        type: ProductType.GOODS,
        isSerialized: false, // Easier for this test
        hsnCode: '8517',
        salePrice: 50000,
        costPrice: 40000,
        isActive: true,
      },
    });

    // 2. Attempt to sell Tenant B's product using Tenant A's token
    const maliciousPayload = {
      shopId: shopA.id, // Current tenant's shop
      customerId: customerA.id,
      customerName: customerA.name,
      customerPhone: customerA.phone,
      items: [
        {
          shopProductId: productB_Other.id, // Maliciously injected ID from Tenant B
          quantity: 1,
          rate: 100,
          gstRate: 18,
        },
      ],
      paymentMode: 'CASH',
    };

    const response = await request(app.getHttpServer())
      .post('/api/mobileshop/sales/invoice')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(maliciousPayload);

    // Should return 400 (Bad Request) or 403 (Forbidden) or 404 (Not Found)
    // depending on how BillingService validates IDs
    expect(response.status).not.toBe(201);
  });
});
