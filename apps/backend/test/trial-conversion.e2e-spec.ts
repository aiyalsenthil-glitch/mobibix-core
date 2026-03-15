import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  BillingCycle,
  ModuleType,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';

const suffix = () => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

async function createTenantWithTrial(
  prisma: PrismaService,
  module: ModuleType,
  trialPlanId: string,
) {
  const tenant = await prisma.tenant.create({
    data: {
      name: `Trial Tenant ${suffix()}`,
      code: `TRIAL-${suffix()}`,
      tenantType: module === ModuleType.GYM ? 'GYM' : 'MOBILE_SHOP',
    },
    select: { id: true },
  });

  const user = await prisma.user.create({
    data: {
      REMOVED_AUTH_PROVIDERUid: `trial-user-${suffix()}`,
      role: UserRole.OWNER,
    },
    select: { id: true },
  });

  await prisma.userTenant.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      role: UserRole.OWNER,
    },
  });

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);

  const subscription = await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      planId: trialPlanId,
      module,
      status: SubscriptionStatus.TRIAL,
      startDate,
      endDate,
    },
    select: { id: true },
  });

  return { tenant, user, subscription };
}

describe('Trial Conversion (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const createdTenantIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdPlanIds: string[] = [];
  const createdPlanPriceIds: string[] = [];
  const createdSubscriptionIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await prisma.tenantSubscription.deleteMany({
      where: { id: { in: createdSubscriptionIds } },
    });
    await prisma.planPrice.deleteMany({
      where: { id: { in: createdPlanPriceIds } },
    });
    await prisma.plan.deleteMany({
      where: { id: { in: createdPlanIds } },
    });
    await prisma.userTenant.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: createdTenantIds } },
    });

    await app.close();
  });

  it('converts TRIAL to ACTIVE on upgrade', async () => {
    const module = ModuleType.GYM;

    const trialPlan = await prisma.plan.create({
      data: {
        code: `TRIAL-${suffix()}`,
        name: `Trial Plan ${suffix()}`,
        level: 0,
        module,
      },
      select: { id: true },
    });

    const paidPlan = await prisma.plan.create({
      data: {
        code: `PAID-${suffix()}`,
        name: `Paid Plan ${suffix()}`,
        level: 1,
        module,
      },
      select: { id: true },
    });

    const planPrice = await prisma.planPrice.create({
      data: {
        planId: paidPlan.id,
        billingCycle: BillingCycle.MONTHLY,
        price: 9900,
        isActive: true,
      },
      select: { id: true },
    });

    createdPlanIds.push(trialPlan.id, paidPlan.id);
    createdPlanPriceIds.push(planPrice.id);

    const { tenant, user, subscription } = await createTenantWithTrial(
      prisma,
      module,
      trialPlan.id,
    );

    createdTenantIds.push(tenant.id);
    createdUserIds.push(user.id);
    createdSubscriptionIds.push(subscription.id);

    const token = jwtService.sign({
      sub: user.id,
      tenantId: tenant.id,
      role: UserRole.OWNER,
    });

    const response = await request(app.getHttpServer())
      .patch('/billing/subscription/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .send({ newPlanId: paidPlan.id, newBillingCycle: 'MONTHLY' })
      .expect(200);

    expect(response.body?.success).toBe(true);

    const updated = await prisma.tenantSubscription.findUnique({
      where: { id: subscription.id },
      select: { status: true, planId: true },
    });

    expect(updated?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(updated?.planId).toBe(paidPlan.id);
  });

  it('rejects upgrade when plan price is missing', async () => {
    const module = ModuleType.GYM;

    const trialPlan = await prisma.plan.create({
      data: {
        code: `TRIAL-NO-PRICE-${suffix()}`,
        name: `Trial Plan No Price ${suffix()}`,
        level: 0,
        module,
      },
      select: { id: true },
    });

    const paidPlan = await prisma.plan.create({
      data: {
        code: `PAID-NO-PRICE-${suffix()}`,
        name: `Paid Plan No Price ${suffix()}`,
        level: 2,
        module,
      },
      select: { id: true },
    });

    createdPlanIds.push(trialPlan.id, paidPlan.id);

    const { tenant, user, subscription } = await createTenantWithTrial(
      prisma,
      module,
      trialPlan.id,
    );

    createdTenantIds.push(tenant.id);
    createdUserIds.push(user.id);
    createdSubscriptionIds.push(subscription.id);

    const token = jwtService.sign({
      sub: user.id,
      tenantId: tenant.id,
      role: UserRole.OWNER,
    });

    const response = await request(app.getHttpServer())
      .patch('/billing/subscription/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .send({ newPlanId: paidPlan.id, newBillingCycle: 'MONTHLY' })
      .expect(400);

    expect(response.body?.message).toContain('No price found');
  });

  it('rejects upgrade when newPlanId is missing (edge case)', async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: `Edge Tenant ${suffix()}`,
        code: `EDGE-${suffix()}`,
        tenantType: 'GYM',
      },
      select: { id: true },
    });

    const user = await prisma.user.create({
      data: {
        REMOVED_AUTH_PROVIDERUid: `edge-user-${suffix()}`,
        role: UserRole.OWNER,
      },
      select: { id: true },
    });

    await prisma.userTenant.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: UserRole.OWNER,
      },
    });

    createdTenantIds.push(tenant.id);
    createdUserIds.push(user.id);

    const token = jwtService.sign({
      sub: user.id,
      tenantId: tenant.id,
      role: UserRole.OWNER,
    });

    await request(app.getHttpServer())
      .patch('/billing/subscription/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('returns error when Razorpay is not configured (payment processing)', async () => {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      return;
    }

    const module = ModuleType.GYM;

    const plan = await prisma.plan.create({
      data: {
        code: `PAY-${suffix()}`,
        name: `Payment Plan ${suffix()}`,
        level: 1,
        module,
      },
      select: { id: true },
    });

    const planPrice = await prisma.planPrice.create({
      data: {
        planId: plan.id,
        billingCycle: BillingCycle.MONTHLY,
        price: 12900,
        isActive: true,
      },
      select: { id: true },
    });

    createdPlanIds.push(plan.id);
    createdPlanPriceIds.push(planPrice.id);

    const tenant = await prisma.tenant.create({
      data: {
        name: `Payment Tenant ${suffix()}`,
        code: `PAY-${suffix()}`,
        tenantType: 'GYM',
      },
      select: { id: true },
    });

    const user = await prisma.user.create({
      data: {
        REMOVED_AUTH_PROVIDERUid: `payment-user-${suffix()}`,
        role: UserRole.OWNER,
      },
      select: { id: true },
    });

    await prisma.userTenant.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: UserRole.OWNER,
      },
    });

    createdTenantIds.push(tenant.id);
    createdUserIds.push(user.id);

    const token = jwtService.sign({
      sub: user.id,
      tenantId: tenant.id,
      role: UserRole.OWNER,
    });

    await request(app.getHttpServer())
      .post('/payments/create-order')
      .set('Authorization', `Bearer ${token}`)
      .send({ planId: plan.id, billingCycle: 'MONTHLY' })
      .expect(500);
  });
});
