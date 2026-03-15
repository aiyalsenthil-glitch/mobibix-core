import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { WhatsAppFeature } from '../src/core/billing/whatsapp-rules';
import { ModuleType, UserRole } from '@prisma/client';

describe('WhatsApp Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let jwtToken: string;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      prisma = app.get(PrismaService);
      await app.init();
      console.log('✅ App Initialized');

      // 1. Create Tenant (Standard Plan)
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Integration Test Gym',
          addressLine1: '123 Fit St', // Fixed field name
          tenantType: 'MOBILE_SHOP',
          code: 'TEST_TENANT_' + Date.now(), // Ensure unique code
        } as any,
      });
      tenantId = tenant.id;

      // 2. Create User
      const user = await prisma.user.create({
        data: {
          phone: '9876543210', // Changed mobile to phone
          REMOVED_AUTH_PROVIDERUid: 'test_REMOVED_AUTH_PROVIDER_uid_' + Date.now(), // Required unique field
          role: 'OWNER',
        },
      });

      // 3. Link User to Tenant (Owner)
      await prisma.userTenant.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: UserRole.OWNER,
        },
      });

      // 4. Generate JWT
      // Assuming AuthController accepts 'mobile' or 'phone'. If it is standard login, it might need updating.
      // But for e2e, if we can't easily mock auth, we might rely on the specific implementation of /auth/login.
      // If /auth/login expects 'mobile', we send 'mobile'.
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ mobile: '9876543210', otp: '1234' });

      jwtToken = loginRes.body.accessToken;

      // 5. Setup WhatsApp Settings & Phone
      await prisma.whatsAppSetting.create({
        data: {
          tenantId,
          // businessName: 'Test Gym', // Removed
          // businessPhone: '919876543210', // Removed
          enabled: true,
          // metadata: {}, // Removed if not needed or valid
        },
      });

      await prisma.whatsAppNumber.create({
        data: {
          tenantId,
          phoneNumber: '919876543210',
          phoneNumberId: '1000000000001',
          wabaId: '2000000000002',
          isEnabled: true,
          isSystem: true,
          displayNumber: '919876543210',
          purpose: 'DEFAULT',
        },
      });

      // 6. Ensure Plans Exist
      const standardPlan = await prisma.plan.findFirst({
        where: { code: 'MOBIBIX_STANDARD' },
      });
      if (!standardPlan) throw new Error('Standard Plan not found');

      // 7. Subscribe to STANDARD
      await prisma.tenantSubscription.create({
        data: {
          tenantId,
          planId: standardPlan.id,
          billingCycle: 'MONTHLY',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Changed nextBillingDate to endDate
          status: 'ACTIVE',
          module: ModuleType.MOBILE_SHOP,
          priceSnapshot: 999,
        },
      });

      // Create a dummy template
      await prisma.whatsAppTemplate.create({
        data: {
          moduleType: 'MOBILE_SHOP',
          templateKey: 'TEST_ALERT',
          metaTemplateName: 'test_alert',
          category: 'UTILITY',
          feature: 'WHATSAPP_ALERTS_AUTOMATION',
          language: 'en',
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      console.error('❌ Error in beforeAll:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup
    await prisma.whatsAppLog.deleteMany({ where: { tenantId } });
    await prisma.whatsAppNumber.deleteMany({ where: { tenantId } });
    await prisma.whatsAppSetting.deleteMany({ where: { tenantId } });
    await prisma.subscriptionAddon.deleteMany({
      where: { subscription: { tenantId } },
    }); // Cascade usually handles this but safety first
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.userTenant.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await prisma.user.deleteMany({ where: { phone: '9876543210' } }); // Changed delete to deleteMany
    await prisma.whatsAppTemplate.deleteMany({
      where: { templateKey: 'TEST_ALERT' },
    });

    await app.close();
  });

  it('STANDARD Plan: Should BLOCK Premium Feature (Automation)', async () => {
    // Attempt to send using template mapped to WHATSAPP_ALERTS_AUTOMATION
    // Standard plan does NOT have this feature.

    // First, find the template ID
    const template = await prisma.whatsAppTemplate.findFirst({
      where: { templateKey: 'TEST_ALERT' },
    });
    if (!template) throw new Error('Template not found');

    const res = await request(app.getHttpServer())
      .post('/whatsapp/send')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        tenantId,
        phone: '919999999999',
        templateId: template.id,
      });

    // We expect it to fail gracefully, returning a Log object with status FAILED
    expect(res.status).toBe(201);

    const log = res.body;
    expect(log).toBeDefined();

    expect(log.status).toBe('FAILED');
    expect(log.error).toContain(
      'Plan missing feature: WHATSAPP_ALERTS_AUTOMATION',
    );
  });

  it('PRO Plan: Should ALLOW Premium Feature', async () => {
    // Upgrade to PRO
    const proPlan = await prisma.plan.findFirst({
      where: { code: 'MOBIBIX_PRO' },
    });
    if (!proPlan) throw new Error('PRO Plan not found');

    await prisma.tenantSubscription.updateMany({
      where: { tenantId },
      data: { planId: proPlan.id },
    });

    const template = await prisma.whatsAppTemplate.findFirst({
      where: { templateKey: 'TEST_ALERT' },
    });
    if (!template) throw new Error('Template not found');

    // Mock axios (We don't want to actually hit Meta API)
    // Jest Spy implementation is tricky in e2e without custom provider override.
    // However, if we fail at 'Plan missing feature', we are good.
    // If we pass that check, we will hit "No active phone number" or "Axios error".
    // Since we added a phone number, it will try to send. axios will throw.
    // So if log error is NOT "Plan missing feature", but something like "Request failed with status code 400" (from axios mock or real fail), that means we PASSED the gate.

    const res = await request(app.getHttpServer())
      .post('/whatsapp/send')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        tenantId,
        phone: '919999999999',
        templateId: template.id,
      });

    const log = res.body;
    // We expect it to NOT be failed due to Plan.
    // It might be failed due to other reasons (axios/meta api), but error should NOT constitute Plan blocker.
    if (log.status === 'FAILED') {
      expect(log.error).not.toContain('Plan missing feature');
    }
  });

  it('STANDARD + Addon: Should ALLOW Premium Feature', async () => {
    // Downgrade back to STANDARD
    const standardPlan = await prisma.plan.findFirst({
      where: { code: 'MOBIBIX_STANDARD' },
    });
    if (!standardPlan) throw new Error('Standard Plan not found');

    await prisma.tenantSubscription.updateMany({
      where: { tenantId },
      data: { planId: standardPlan.id },
    });

    // Add Addon
    const addonPlan = await prisma.plan.findFirst({
      where: { code: 'WHATSAPP_CRM' },
    });
    if (!addonPlan) throw new Error('Addon Plan not found');
    const subscription = await prisma.tenantSubscription.findFirst({
      where: { tenantId },
    });
    if (!subscription) throw new Error('Subscription not found');

    await prisma.subscriptionAddon.create({
      data: {
        subscriptionId: subscription.id,
        addonPlanId: addonPlan.id,
        priceSnapshot: 100,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });

    const template = await prisma.whatsAppTemplate.findFirst({
      where: { templateKey: 'TEST_ALERT' },
    });
    if (!template) throw new Error('Template not found');

    const res = await request(app.getHttpServer())
      .post('/whatsapp/send')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        tenantId,
        phone: '919999999999',
        templateId: template.id,
      });

    const log = res.body;
    if (log.status === 'FAILED') {
      expect(log.error).not.toContain('Plan missing feature');
    }
  });
});
