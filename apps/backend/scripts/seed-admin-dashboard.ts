/**
 * Seed demo tenants + trigger admin dashboard aggregation.
 * Run: npx ts-node -P tsconfig.json scripts/seed-admin-dashboard.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MetricsAggregatorService } from '../src/core/admin/jobs/metrics-aggregator.service';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { subDays } from 'date-fns';
import {
  BillingCycle,
  ModuleType,
  SubscriptionStatus,
} from '@prisma/client';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const prisma = app.get(PrismaService);
  const aggregator = app.get(MetricsAggregatorService);

  // ── 1. Find existing plans (seeded via prisma/seed.ts) ────────────────────
  const mobibixPlan = await prisma.plan.findFirst({
    where: { module: ModuleType.MOBILE_SHOP, isActive: true },
    orderBy: { level: 'asc' },
  });
  const gymPlan = await prisma.plan.findFirst({
    where: { module: ModuleType.GYM, isActive: true },
    orderBy: { level: 'asc' },
  });

  if (!mobibixPlan || !gymPlan) {
    console.error('❌ No plans found. Run `npx prisma db seed` first.');
    await app.close();
    process.exit(1);
  }

  console.log(`✅ Using plans: "${mobibixPlan.name}" + "${gymPlan.name}"`);

  // ── 2. Demo tenants ────────────────────────────────────────────────────────
  const DEMO = [
    { name: 'Quick Fix Mobile', code: 'DEMO_QFM', type: 'MOBILE_SHOP', planId: mobibixPlan.id, module: ModuleType.MOBILE_SHOP, price: 99900, status: SubscriptionStatus.ACTIVE, daysOld: 90, staff: 6, shops: 2 },
    { name: 'iRepair Solutions', code: 'DEMO_IRS', type: 'MOBILE_SHOP', planId: mobibixPlan.id, module: ModuleType.MOBILE_SHOP, price: 99900, status: SubscriptionStatus.ACTIVE, daysOld: 55, staff: 3, shops: 1 },
    { name: 'Phone Zone',        code: 'DEMO_PHZ', type: 'MOBILE_SHOP', planId: mobibixPlan.id, module: ModuleType.MOBILE_SHOP, price: 99900, status: SubscriptionStatus.PAST_DUE, daysOld: 40, staff: 1, shops: 1 },
    { name: 'FitLife Gym',       code: 'DEMO_FLG', type: 'GYM',         planId: gymPlan.id,     module: ModuleType.GYM,          price: 59900, status: SubscriptionStatus.ACTIVE, daysOld: 120, staff: 8, shops: 1 },
    { name: 'Iron Hub',          code: 'DEMO_IHB', type: 'GYM',         planId: gymPlan.id,     module: ModuleType.GYM,          price: 59900, status: SubscriptionStatus.ACTIVE, daysOld: 25, staff: 2, shops: 1 },
    { name: 'Flex Studio',       code: 'DEMO_FLS', type: 'GYM',         planId: gymPlan.id,     module: ModuleType.GYM,          price: 59900, status: SubscriptionStatus.EXPIRED, daysOld: 8, staff: 0, shops: 1 },
  ];

  for (const cfg of DEMO) {
    const existing = await prisma.tenant.findFirst({ where: { code: cfg.code } });
    if (existing) {
      console.log(`⏭  ${cfg.code} exists — skipping`);
      // Still refresh usage snapshot
      await prisma.usageSnapshot.upsert({
        where: { tenantId_date: { tenantId: existing.id, date: new Date(new Date().setHours(0, 0, 0, 0)) } },
        create: { tenantId: existing.id, date: new Date(new Date().setHours(0, 0, 0, 0)), activeStaff: cfg.staff, activeShops: cfg.shops },
        update: { activeStaff: cfg.staff, activeShops: cfg.shops },
      });
      continue;
    }

    const startDate = subDays(new Date(), cfg.daysOld);
    const endDate = cfg.status === SubscriptionStatus.EXPIRED
      ? subDays(new Date(), 3)
      : new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);

    const tenant = await prisma.tenant.create({
      data: {
        name: cfg.name,
        code: cfg.code,
        tenantType: cfg.type,
        contactEmail: `admin@${cfg.code.toLowerCase()}.demo`,
        createdAt: startDate,
      },
    });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: cfg.planId,
        module: cfg.module,
        status: cfg.status,
        billingCycle: BillingCycle.MONTHLY,
        priceSnapshot: cfg.price,
        startDate,
        endDate,
        createdAt: startDate,
      },
    });

    await prisma.usageSnapshot.upsert({
      where: { tenantId_date: { tenantId: tenant.id, date: new Date(new Date().setHours(0, 0, 0, 0)) } },
      create: { tenantId: tenant.id, date: new Date(new Date().setHours(0, 0, 0, 0)), activeStaff: cfg.staff, activeShops: cfg.shops },
      update: { activeStaff: cfg.staff, activeShops: cfg.shops },
    });

    console.log(`✅ ${cfg.name} (${cfg.status})`);
  }

  // ── 3. Run aggregation for last 7 days ────────────────────────────────────
  console.log('\n🔄 Aggregating revenue stats (7 days)...');
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    await aggregator.aggregateDailyRevenue(date);
    process.stdout.write(`  ✓ ${date.toISOString().split('T')[0]}\n`);
  }

  console.log('\n🔄 Computing health scores...');
  await aggregator.computeAllTenantHealthScores();

  console.log('\n✅ Done! Ready to test:');
  console.log('   → /admin/financials');
  console.log('   → /admin/tenant-intelligence');

  await app.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
