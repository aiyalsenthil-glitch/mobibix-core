import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from '../src/core/cache/cache.service';
import { v4 as uuidv4 } from 'uuid';
import {
  GRACE_PERIOD_DAYS,
  SOFT_GRACE_PERIOD_DAYS,
} from '../src/core/billing/grace-period.constants';

describe('Expiry Enforcement (E2E Tests)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let cacheService: CacheService;

  let tenantId: string;
  let baseUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    cacheService = app.get(CacheService);

    // Setup basic tenant and user
    tenantId = `tenant_${uuidv4().substring(0, 8)}`;
    baseUserId = `user_${uuidv4().substring(0, 8)}`;

    const plan = await prisma.plan.upsert({
      where: { code: 'PRO' },
      update: {},
      create: {
        code: 'PRO',
        name: 'Pro',
        level: 2,
        module: 'MOBILE_SHOP',
        isActive: true,
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantId,
        code: tenantId,
        name: 'Test Setup',
        tenantType: 'STANDARD',
        timezone: 'Asia/Kolkata', // Add timezone context
      },
    });

    await prisma.user.create({
      data: {
        id: baseUserId,
        REMOVED_AUTH_PROVIDERUid: `fb_${uuidv4()}`,
        role: 'OWNER',
        tenantId: tenantId,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId },
    });
    await prisma.user.deleteMany({
      where: { id: baseUserId },
    });
    await prisma.tenant.deleteMany({
      where: { id: tenantId },
    });
    await app.close();
  });
  
  beforeEach(async () => {
     jest.useRealTimers();
     await prisma.tenantSubscription.deleteMany({
      where: { tenantId },
    });
    // Clear cache to prevent interference
    await cacheService.delete(`tenant:${tenantId}:subscription:MOBILE_SHOP`);
  });

  const generateJwt = (userId: string, tenantId: string, expiresIn: string) => {
    return jwtService.sign(
      { sub: userId, tenantId: tenantId, role: 'OWNER' },
      { expiresIn: expiresIn as any },
    );
  };

  it('1. User Changes System Clock - Server validates against server clock, not client', async () => {
    // This is essentially validated by checking if expiration is handled correctly
    // Regardless of client timestamps. We'll simulate server clock progression.

    const jwt = generateJwt(baseUserId, tenantId, '10y');
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 50); // Fully expired

    await prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: (await prisma.plan.findFirst({ where: { code: 'PRO' } }))!.id,
        status: 'ACTIVE', // Status remains ACTIVE maliciously or accidentally 
        module: 'MOBILE_SHOP',
        startDate: new Date(pastDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days prior
        endDate: pastDate,
      },
    });

    // Endpoint that writes data (requires ACTIVE & valid sub)
    // The server should block because server's 'now' is past the 'endDate' + grace period
    const res = await request(app.getHttpServer())
      .post('/receipts') // Example mutation
      .set('Authorization', `Bearer ${jwt}`)
      .send({});
      
    // Even if client clock is mocked/sent, server reads own Date.now()
    expect(res.status).toBe(403);
    // The SubscriptionGuard fails to find an ACTIVE sub, returning:
    expect(res.body.message).toMatch(/Your subscription has expired/i);
  });

  it('2. User Keeps Old JWT After Expiry - Token valid but Sub Expired', async () => {
    // JWT perfectly valid for 10 years
    const jwt = generateJwt(baseUserId, tenantId, '10y');
    
    // DB state is EXPIRED
    const recentEnd = new Date();
    recentEnd.setDate(recentEnd.getDate() - (SOFT_GRACE_PERIOD_DAYS + 1)); // Just past soft grace

    await prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: (await prisma.plan.findFirst({ where: { code: 'PRO' } }))!.id,
        status: 'EXPIRED', // Marking EXPIRED directly
        module: 'MOBILE_SHOP',
        startDate: new Date(),
        endDate: recentEnd,
      },
    });

    // Valid JWT, but server catches DB state in Guard
    const res = await request(app.getHttpServer())
      .post('/receipts')
      .set('Authorization', `Bearer ${jwt}`)
      .send({});
      
    expect(res.status).toBe(403);
    // The SubscriptionGuard fails to find an ACTIVE sub, returning:
    expect(res.body.message).toMatch(/No active MOBILE_SHOP subscription/i);
  });

  it('3. Background Job Fails - Defensive Status Evaluation', async () => {
    // Subscription status left completely as 'ACTIVE' by failed cron job
    // Real time is FAR PAST the grace period
    const jwt = generateJwt(baseUserId, tenantId, '1d');
    
    const farPastEnd = new Date();
    farPastEnd.setDate(farPastEnd.getDate() - 100);

    await prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: (await prisma.plan.findFirst({ where: { code: 'PRO' } }))!.id,
        status: 'ACTIVE', // Left active by mistake
        module: 'MOBILE_SHOP',
        startDate: new Date(),
        endDate: farPastEnd,
      },
    });

    // Middleware runs mathematically regardless of DB status text
    const res = await request(app.getHttpServer())
      .post('/receipts')
      .set('Authorization', `Bearer ${jwt}`)
      .send({});
      
    expect(res.status).toBe(403);
    // SubscriptionGuard calculates the math and rejects it as EXPIRED
    expect(res.body.message).toMatch(/Your subscription has expired/i);
  });

  it('8. Tenant has overlapping subscriptions - DB strictly rejects concurrent rows per module', async () => {
    const jwt = generateJwt(baseUserId, tenantId, '1d');
    const planId = (await prisma.plan.findFirst({ where: { code: 'PRO' } }))!.id;

    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 30); // Valid
    
    // Create first subscription
    await prisma.tenantSubscription.create({
      data: {
        tenantId, planId, status: 'ACTIVE', module: 'MOBILE_SHOP',
        startDate: new Date(), endDate: futureEnd,
      },
    });

    // Create overlapping subscription - SHOULD THROW Prisma Error due to @@unique([tenantId, module])
    let error: any;
    try {
      await prisma.tenantSubscription.create({
        data: {
          tenantId, planId, status: 'ACTIVE', module: 'MOBILE_SHOP',
          startDate: new Date(), endDate: futureEnd,
        },
      });
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.code).toBe('P2002'); // Prisma Unique Constraint Violation
  });
});
