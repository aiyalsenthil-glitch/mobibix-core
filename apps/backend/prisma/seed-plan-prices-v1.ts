/**
 * ============================================================
 * SEED SCRIPT: Plan Prices (V1 Clean)
 * ============================================================
 *
 * Purpose: Create explicit pricing for V1 plans.
 *          One price per Plan + BillingCycle.
 *
 * Pricing:
 *   TRIAL:
 *     - MONTHLY: ₹0 (free)
 *   STANDARD:
 *     - MONTHLY: ₹199
 *     - QUARTERLY: ₹499
 *     - YEARLY: ₹1799
 *   PRO:
 *     - MONTHLY: ₹399
 *     - QUARTERLY: ₹999
 *     - YEARLY: ₹3599
 *   WHATSAPP_CRM:
 *     - MONTHLY: ₹299
 *     - QUARTERLY: ₹749
 *
 *     - YEARLY: ₹2699
 *
 * CRITICAL:
 *   - Prices are EXPLICIT (no calculations)
 *   - Prices are in paise (₹1 = 100 paise)
 *   - One unique price per (planId, billingCycle)
 *   - No discounts or dynamic logic
 *   - Operation is IDEMPOTENT (safe to run multiple times)
 *
 * Usage:
 *   npx ts-node -r dotenv/config prisma/seed-plan-prices-v1.ts
 *
 * ============================================================
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * V1 Explicit Pricing (in paise)
 */
const V1_PRICING = {
  GYM_TRIAL: {
    MONTHLY: { price: 0 }, // Free
  },
  GYM_STANDARD: {
    MONTHLY: { price: 19900, rzpId: 'plan_SHBOsZJTYHebiW' },
    QUARTERLY: { price: 49900, rzpId: 'plan_SHBPLvynxI8DHm' },
    YEARLY: { price: 179900, rzpId: 'plan_SHBPmj5c3CvVIf' },
  },
  GYM_PRO: {
    MONTHLY: { price: 39900, rzpId: 'plan_SHBQ79swgdys0w' },
    QUARTERLY: { price: 99900, rzpId: 'plan_SHBQRsgv145eT3' },
    YEARLY: { price: 359900, rzpId: 'plan_SHBQkjqOEiBFMV' },
  },
  WHATSAPP_CRM: {
    MONTHLY: { price: 29900 },
    QUARTERLY: { price: 74900 },
    YEARLY: { price: 269900 },
  },
  MOBIBIX_TRIAL: {
    MONTHLY: { price: 0 },
  },
  MOBIBIX_STANDARD: {
    MONTHLY: { price: 29900, rzpId: 'plan_SHBR5Wloh9IpvS' },
    QUARTERLY: { price: 79900, rzpId: 'plan_SHBR0tMAfnvz1P' },
    YEARLY: { price: 299900, rzpId: 'plan_SHBRhzJtBLtjnK' },
  },
  MOBIBIX_PRO: {
    MONTHLY: { price: 49900, rzpId: 'plan_SHBS7oI1veoGlY' },
    QUARTERLY: { price: 139900, rzpId: 'plan_SHBUe12IEyECwq' },
    YEARLY: { price: 499900, rzpId: 'plan_SHBU6VWrCKq5m4' },
  },
};

async function seedPlanPrices() {
  console.log('💰 V1 Plan Prices Seeder');
  console.log('==================================================\n');

  let priceCount = 0;

  // Get all plans
  const plans = await prisma.plan.findMany({
    where: {
      code: { in: Object.keys(V1_PRICING) },
    },
  });

  if (plans.length === 0) {
    console.error('❌ No plans found. Run seed-plans-v1.ts first!');
    process.exit(1);
  }

  console.log(`Found ${plans.length} plans to price:\n`);

  for (const plan of plans) {
    const planPrices = V1_PRICING[plan.code as keyof typeof V1_PRICING];

    if (!planPrices) {
      console.warn(`⚠️  No pricing defined for ${plan.code}, skipping`);
      continue;
    }

    console.log(`📋 ${plan.name} (${plan.code})`);

    for (const [cycle, data] of Object.entries(planPrices)) {
      const { price, rzpId } = data as { price: number; rzpId?: string };
      try {
        await prisma.planPrice.upsert({
          where: {
            planId_billingCycle: {
              planId: plan.id,
              billingCycle: cycle as any,
            },
          },
          update: {
            price: price,
            REMOVED_PAYMENT_INFRAPlanId: rzpId || null,
            isActive: true,
          },
          create: {
            planId: plan.id,
            billingCycle: cycle as any,
            price: price,
            REMOVED_PAYMENT_INFRAPlanId: rzpId || null,
            isActive: true,
          },
        });

        const rupees = price / 100;
        console.log(`   ${cycle}: ₹${rupees.toFixed(2)}${rzpId ? ` [RZP: ${rzpId}]` : ''}`);
        priceCount++;
      } catch (error: any) {
        console.error(`   ❌ Failed to seed ${cycle} price:`, error.message);
        throw error;
      }
    }
    console.log();
  }

  console.log('==================================================');
  console.log('📊 Summary:');
  console.log(`   ✅ Price points created: ${priceCount}`);
  console.log(
    `   🔒 Total PlanPrice records: ${await prisma.planPrice.count()}`,
  );
  console.log('\n✅ V1 Plan Prices seeded successfully!\n');
}

seedPlanPrices()
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
