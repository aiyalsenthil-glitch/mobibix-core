/**
 * Seed script: Feed commission + target + earnings data for test@gmail.com
 * Run: npx tsx prisma/seed-commission.ts
 */

import { PrismaClient, CommissionScope, CommissionType, EarningStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

type SeedUser = {
  id: string;
  fullName: string | null;
  email: string | null;
};

async function main() {
  // ─── 1. Find the owner user ───────────────────────────────────────────────
  const owner = await prisma.user.findFirst({
    where: { email: 'test@gmail.com' },
  });

  if (!owner) {
    console.error('❌ User test@gmail.com not found');
    process.exit(1);
  }

  const tenantId = owner.tenantId;
  if (!tenantId) {
    console.error('❌ User has no tenantId');
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { shops: { take: 1 } },
  });

  if (!tenant) { console.error('❌ Tenant not found'); process.exit(1); }
  const shop = tenant.shops[0];
  if (!shop) { console.error('❌ No shop found on tenant'); process.exit(1); }

  console.log(`✅ Owner: ${owner.email}`);
  console.log(`   Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`   Shop:   ${shop.name} (${shop.id})`);

  // ─── 2. Create / reuse staff users ───────────────────────────────────────
  const staffDefs = [
    { email: 'arjun.kumar@mobibix.test', fullName: 'Arjun Kumar' },
    { email: 'priya.sharma@mobibix.test', fullName: 'Priya Sharma' },
    { email: 'rahul.singh@mobibix.test', fullName: 'Rahul Singh' },
  ];

  const staffUsers: SeedUser[] = [];

  for (const def of staffDefs) {
    let u = await prisma.user.findFirst({ where: { email: def.email } });

    if (!u) {
      u = await prisma.user.create({
        data: {
          email: def.email,
          fullName: def.fullName,
          REMOVED_AUTH_PROVIDERUid: `seed-${def.email}-${Date.now()}`,
          role: UserRole.STAFF,
          tenantId: tenant.id,
        },
      });
      console.log(`   👤 Created: ${def.fullName}`);
    } else {
      console.log(`   ♻️  Exists:  ${def.fullName}`);
    }

    // Ensure UserTenant link
    await prisma.userTenant.upsert({
      where: { userId_tenantId: { userId: u.id, tenantId: tenant.id } },
      update: {},
      create: { userId: u.id, tenantId: tenant.id, role: UserRole.STAFF },
    });

    staffUsers.push({ id: u.id, fullName: u.fullName, email: u.email });
  }

  // ─── 3. Commission rules ─────────────────────────────────────────────────
  const ruleCount = await prisma.commissionRule.count({
    where: { tenantId: tenant.id, shopId: shop.id },
  });

  if (ruleCount === 0) {
    await prisma.commissionRule.createMany({
      data: [
        {
          tenantId: tenant.id,
          shopId: shop.id,
          name: 'Standard Sales Commission',
          applyTo: CommissionScope.ALL_STAFF,
          type: CommissionType.PERCENTAGE_OF_SALE,
          value: 2.0,
          isActive: true,
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          shopId: shop.id,
          name: 'Accessories Flat Bonus',
          applyTo: CommissionScope.ALL_STAFF,
          category: 'Accessories',
          type: CommissionType.FIXED_PER_ITEM,
          value: 20,
          isActive: true,
          updatedAt: new Date(),
        },
      ],
    });
    console.log('   📋 Created 2 commission rules');
  } else {
    console.log(`   ♻️  ${ruleCount} commission rules already exist`);
  }

  const rule = await prisma.commissionRule.findFirst({
    where: { tenantId: tenant.id, shopId: shop.id },
  });

  // ─── 4. Staff targets — March 2026 ───────────────────────────────────────
  const month = 3;
  const year = 2026;

  const targetMap = [
    { idx: 0, revenueTarget: BigInt(50000000), repairTarget: 30, salesTarget: 15 },  // Arjun  ₹5L
    { idx: 1, revenueTarget: BigInt(75000000), repairTarget: 40, salesTarget: 20 },  // Priya  ₹7.5L
    { idx: 2, revenueTarget: BigInt(40000000), repairTarget: 25, salesTarget: 10 },  // Rahul  ₹4L
  ];

  for (const t of targetMap) {
    const staffId = staffUsers[t.idx].id;
    const { idx: _idx, ...targetFields } = t;
    await prisma.staffTarget.upsert({
      where: { staffId_month_year: { staffId, month, year } },
      update: { revenueTarget: targetFields.revenueTarget, repairTarget: targetFields.repairTarget, salesTarget: targetFields.salesTarget },
      create: { tenantId: tenant.id, shopId: shop.id, staffId, month, year, ...targetFields },
    });
  }
  console.log('   🎯 Upserted staff targets for March 2026');

  // Shop target
  await prisma.shopTarget.upsert({
    where: { shopId_month_year: { shopId: shop.id, month, year } },
    update: { revenueTarget: BigInt(200000000) },
    create: {
      tenantId: tenant.id, shopId: shop.id, month, year,
      revenueTarget: BigInt(200000000), repairTarget: 100, salesTarget: 50,
    },
  });
  console.log('   🏪 Upserted shop target ₹2,00,000 for March 2026');

  // ─── 5. Earnings ─────────────────────────────────────────────────────────
  if (!rule) { console.log('   ⚠️  No rule found, skipping earnings'); return; }

  const existingEarnings = await prisma.staffEarning.count({
    where: { tenantId: tenant.id, shopId: shop.id },
  });

  if (existingEarnings === 0) {
    const earningRows = [
      // Arjun — ~68% of ₹5L → ₹3.4L in sales
      { staffIdx: 0, saleAmount: 3200000, earned: 64000 },
      { staffIdx: 0, saleAmount: 1800000, earned: 36000 },
      { staffIdx: 0, saleAmount: 2500000, earned: 50000 },
      // Priya — ~85% of ₹7.5L → ₹6.375L in sales
      { staffIdx: 1, saleAmount: 4500000, earned: 90000 },
      { staffIdx: 1, saleAmount: 3200000, earned: 64000 },
      { staffIdx: 1, saleAmount: 2500000, earned: 50000 },
      // Rahul — ~45% of ₹4L → ₹1.8L in sales
      { staffIdx: 2, saleAmount: 1800000, earned: 36000 },
      { staffIdx: 2, saleAmount: 1200000, earned: 24000 },
    ];

    for (const [i, row] of earningRows.entries()) {
      await prisma.staffEarning.create({
        data: {
          tenantId: tenant.id,
          shopId: shop.id,
          staffId: staffUsers[row.staffIdx].id,
          invoiceId: `seed-inv-${Date.now()}-${i}`,
          ruleId: rule.id,
          saleAmount: row.saleAmount,
          profitAmount: Math.round(row.saleAmount * 0.15),
          earned: row.earned,
          status: i % 3 === 0 ? EarningStatus.APPROVED : EarningStatus.PENDING,
          createdAt: new Date(2026, 2, Math.floor(Math.random() * 19) + 1),
        },
      });
    }
    console.log(`   💰 Created ${earningRows.length} earnings entries`);
  } else {
    console.log(`   ♻️  ${existingEarnings} earnings already exist, skipping`);
  }

  // ─── 6. Done ──────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete!');
  console.log(`   Arjun  → 68% of ₹5L   | Priya → 85% of ₹7.5L | Rahul → 45% of ₹4L`);
  console.log('   ➡  /staff-management?tab=leaderboard  — see ranking');
  console.log('   ➡  /staff-management?tab=commission   — earnings ledger');
  console.log('   ➡  /dashboard (select shop)           — revenue target card');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
