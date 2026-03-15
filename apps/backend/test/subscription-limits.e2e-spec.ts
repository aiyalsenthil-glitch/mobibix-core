import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { ModuleType, UserRole } from '@prisma/client';

describe('Subscription Limits & Downgrade (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let jwtToken: string;

  // Helpers
  const createTenant = async () => {
    const mobile = `98${Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, '0')}`;
    const user = await prisma.user.create({
      data: { mobile, otp: '1234' } as any,
    });

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Limit Test Gym',
        address: '456 Pump St',
        tenantType: 'MOBILE_SHOP',
      } as any,
    });

    await prisma.userTenant.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: UserRole.OWNER,
      },
    });

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ mobile, otp: '1234' });

    return {
      tenantId: tenant.id,
      token: loginRes.body.accessToken,
      userId: user.id,
      mobile,
    };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Downgrade Pre-check', () => {
    let dTenantId: string;
    let dToken: string;
    let standardPlanId: string;
    let proPlanId: string;

    beforeAll(async () => {
      const data = await createTenant();
      dTenantId = data.tenantId;
      dToken = data.token;

      // Ensure Plans exist and set limits
      const stdParams = {
        code: 'MOBIBIX_STANDARD_LIMIT_TEST',
        name: 'Standard Limit Test',
        maxStaff: 2,
        isActive: true,
        level: 1,
        module: ModuleType.MOBILE_SHOP,
      };
      const proParams = {
        code: 'MOBIBIX_PRO_LIMIT_TEST',
        name: 'Pro Limit Test',
        maxStaff: 10,
        isActive: true,
        level: 2,
        module: ModuleType.MOBILE_SHOP,
      };

      const std = await prisma.plan.upsert({
        where: { code: stdParams.code },
        update: stdParams as any,
        create: stdParams as any,
      });
      standardPlanId = std.id;

      const pro = await prisma.plan.upsert({
        where: { code: proParams.code },
        update: proParams as any,
        create: proParams as any,
      });
      proPlanId = pro.id;

      // Start on PRO
      await prisma.tenantSubscription.create({
        data: {
          tenantId: dTenantId,
          planId: proPlanId,
          module: ModuleType.MOBILE_SHOP,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + 10000000),
          billingCycle: 'MONTHLY',
          priceSnapshot: 1000,
        } as any,
      });
    });

    afterAll(async () => {
      // Cleanup tenants and data specifically created
      await prisma.userTenant.deleteMany({ where: { tenantId: dTenantId } });
      await prisma.shop.deleteMany({ where: { tenantId: dTenantId } });
      await prisma.tenantSubscription.deleteMany({
        where: { tenantId: dTenantId },
      });
      await prisma.tenant.delete({ where: { id: dTenantId } });
      // Plan cleanup if needed, but upserted so maybe OK to leave or delete if unique code
      await prisma.plan.deleteMany({
        where: {
          code: {
            in: ['MOBIBIX_STANDARD_LIMIT_TEST', 'MOBIBIX_PRO_LIMIT_TEST'],
          },
        },
      });
    });

    it('should BLOCK downgrade if staff limit exceeded', async () => {
      // 1. Add 3 staff (total 4 users including owner? - Wait logic counts role=STAFF)
      // We need to add users with role STAFF
      const staffUsers: any[] = [];
      for (let i = 0; i < 3; i++) {
        const u = await prisma.user.create({
          data: { mobile: `900000000${i}` } as any,
        });
        await prisma.userTenant.create({
          data: {
            userId: u.id,
            tenantId: dTenantId,
            role: UserRole.STAFF,
          } as any,
        });
        staffUsers.push(u);
      }

      // Check count
      const count = await prisma.userTenant.count({
        where: { tenantId: dTenantId, role: UserRole.STAFF },
      });
      expect(count).toBe(3);

      // 2. Check Downgrade to Standard (Max 2)
      const res = await request(app.getHttpServer())
        .get('/billing/subscription/downgrade-check')
        .query({ targetPlan: standardPlanId, module: 'MOBILE_SHOP' })
        .set('Authorization', `Bearer ${dToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isEligible).toBe(false);
      expect(res.body.blockers.length).toBeGreaterThan(0);
      expect(res.body.blockers[0]).toContain('You have 3 staff members');

      // Cleanup Staff
      await prisma.userTenant.deleteMany({
        where: { tenantId: dTenantId, role: UserRole.STAFF },
      });
      for (const u of staffUsers) {
        await prisma.user.delete({ where: { id: u.id } });
      }
    });

    it('should ALLOW downgrade if within limits', async () => {
      // 0 Staff now. Standard allows 2.
      const res = await request(app.getHttpServer())
        .get('/billing/subscription/downgrade-check')
        .query({ targetPlan: standardPlanId, module: 'MOBILE_SHOP' })
        .set('Authorization', `Bearer ${dToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isEligible).toBe(true);
      expect(res.body.blockers.length).toBe(0);
    });
  });

  describe('TRIAL Daily Limit', () => {
    let tTenantId: string;
    let tToken: string;
    let templateId: string;

    beforeAll(async () => {
      const data = await createTenant();
      tTenantId = data.tenantId;
      tToken = data.token;

      // Ensure TRIAL Plan exists
      const trial = await prisma.plan.upsert({
        where: { code: 'TRIAL' },
        update: { code: 'TRIAL', name: 'Trial Plan', isActive: true } as any,
        create: { code: 'TRIAL', name: 'Trial Plan', isActive: true } as any,
      });

      // Rules are fetched via PlanRulesService which might rely on Plan Code 'TRIAL' or Subscription Status 'TRIAL'
      // WhatsAppSender checks `planRules?.code === 'TRIAL'`.
      // So we need a subscription to specific plan OR status?
      // PlanRulesService usually derives from active subscription.

      await prisma.tenantSubscription.create({
        data: {
          tenantId: tTenantId,
          planId: trial.id,
          module: ModuleType.MOBILE_SHOP,
          status: 'TRIAL',
          startDate: new Date(),
          endDate: new Date(Date.now() + 10000000),
          billingCycle: 'MONTHLY',
          priceSnapshot: 0,
        } as any,
      });

      // Setup WhatsApp settings
      await prisma.whatsAppSetting.create({
        data: {
          tenantId: tTenantId,
          phoneResourceId: 'test',
          enabled: true,
        } as any,
      });

      // Need a template
      const tpl = await prisma.whatsAppTemplate.create({
        data: {
          moduleType: 'MOBILE_SHOP',
          templateKey: 'LIMIT_TEST',
          metaTemplateName: 'limit_test',
          category: 'UTILITY',
          feature: 'WHATSAPP_UTILITY', // Standard feature
          language: 'en',
          status: 'ACTIVE',
        } as any,
      });
      templateId = tpl.id;

      // Need active phone number (Mocked mostly by checking DB in service)
      await prisma.whatsAppNumber.create({
        data: {
          tenantId: tTenantId,
          phoneNumber: '919000000000',
          phoneNumberId: '123',
          wabaId: '456',
          isActive: true,
          purpose: 'DEFAULT',
        } as any,
      });
    });

    afterAll(async () => {
      await prisma.whatsAppLog.deleteMany({ where: { tenantId: tTenantId } });
      await prisma.whatsAppNumber.deleteMany({
        where: { tenantId: tTenantId },
      });
      await prisma.whatsAppSetting.deleteMany({
        where: { tenantId: tTenantId },
      });
      await prisma.whatsAppTemplate.deleteMany({ where: { id: templateId } });
      await prisma.tenantSubscription.deleteMany({
        where: { tenantId: tTenantId },
      });
      await prisma.userTenant.deleteMany({ where: { tenantId: tTenantId } });
      await prisma.tenant.delete({ where: { id: tTenantId } });
    });

    it('should enforce 10 messages/day limit for TRIAL', async () => {
      // 1. Send 10 messages -> Should succeed (assuming axios mock doesn't fail, or we expect "No active phone number" etc but NOT "Quota exceeded")
      // Logic: "Guardrail 2" is checked BEFORE sending.

      // We can just insert logs directly to simulate usage! simpler than making 10 requests.
      const today = new Date();

      // Create 10 logs
      await prisma.whatsAppLog.createMany({
        data: Array(10)
          .fill(0)
          .map(() => ({
            tenantId: tTenantId,
            phone: '919000000000',
            type: 'UTILITY',
            status: 'SENT',
            sentAt: today,
          })),
      });

      // 2. Try sending 11th
      const res = await request(app.getHttpServer())
        .post('/whatsapp/send')
        .set('Authorization', `Bearer ${tToken}`)
        .send({
          tenantId: tTenantId,
          phone: '919999999999',
          templateId: templateId,
        });

      // Expect 201 (Created) but body contains error/skipped
      const log = res.body; // Controller returns the log/result

      // The controller for /whatsapp/send returns `result` which is from service.
      // Service returns { success: false, skipped: true, reason: '...' }

      // Wait, let's check controller.
      // If controller returns just the log, we check log.error.
      expect(log.error).toContain('Daily WhatsApp quota exceeded');
      expect(log.status).toBe('FAILED');
    });
  });
});
