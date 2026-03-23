/**
 * WhatsApp Official Plan — Razorpay Plan Initializer
 * =====================================================
 * Run once to create Razorpay plans for WA_OFFICIAL_STARTER/PRO/BUSINESS
 * and update PlanPrice.REMOVED_PAYMENT_INFRAPlanId in the database.
 *
 * Usage:
 *   cd apps/backend
 *   npx ts-node -e "require('./src/scripts/init-wa-REMOVED_PAYMENT_INFRA-plans')"
 *   -- OR --
 *   npx ts-node src/scripts/init-wa-REMOVED_PAYMENT_INFRA-plans.ts
 *
 * Required env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, DATABASE_URL
 */

import 'dotenv/config';
import Razorpay from 'REMOVED_PAYMENT_INFRA';
import { PrismaClient, BillingCycle } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ─── Pricing (must match seed.ts V1_PRICING) ────────────────────────────────
const WA_PLANS: Array<{
  code: string;
  name: string;
  prices: { cycle: BillingCycle; paise: number }[];
}> = [
  {
    code: 'WA_OFFICIAL_STARTER',
    name: 'WhatsApp Official – Starter',
    prices: [
      { cycle: 'MONTHLY', paise: 49900 },    // ₹499  (1k util × ₹0.45 = ₹450 → ₹499)
      { cycle: 'YEARLY',  paise: 479900 },   // ₹4,799 (20% off)
    ],
  },
  {
    code: 'WA_OFFICIAL_PRO',
    name: 'WhatsApp Official – Pro',
    prices: [
      { cycle: 'MONTHLY', paise: 179900 },   // ₹1,799 (3k util+150 mktg × 2.5× Authkey)
      { cycle: 'YEARLY',  paise: 1729900 },  // ₹17,299 (20% off)
    ],
  },
  {
    code: 'WA_OFFICIAL_BUSINESS',
    name: 'WhatsApp Official – Business',
    prices: [
      { cycle: 'MONTHLY', paise: 459900 },   // ₹4,599 (8k util+400 mktg × 2.5× Authkey)
      { cycle: 'YEARLY',  paise: 4419900 },  // ₹44,199 (20% off)
    ],
  },
];

// Razorpay subscription periods
const CYCLE_TO_RZP: Record<string, { period: 'monthly' | 'yearly'; interval: number }> = {
  MONTHLY:   { period: 'monthly', interval: 1 },
  YEARLY:    { period: 'yearly',  interval: 1 },
};

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error('❌  RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env');
    process.exit(1);
  }

  const REMOVED_PAYMENT_INFRA = new Razorpay({ key_id: keyId, key_secret: keySecret });

  const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma  = new PrismaClient({ adapter });

  const summary: Array<{ planCode: string; cycle: string; rzpPlanId: string; status: string }> = [];

  for (const plan of WA_PLANS) {
    // Resolve plan DB id
    const dbPlan = await prisma.plan.findFirst({ where: { code: plan.code } });

    if (!dbPlan) {
      console.warn(`⚠️  Plan "${plan.code}" not found in DB — skipping (run seed first)`);
      continue;
    }

    for (const { cycle, paise } of plan.prices) {
      const rzpCfg = CYCLE_TO_RZP[cycle];

      // Check if PlanPrice already has REMOVED_PAYMENT_INFRAPlanId
      const planPrice = await prisma.planPrice.findUnique({
        where: {
          planId_billingCycle_currency: {
            planId:       dbPlan.id,
            billingCycle: cycle as BillingCycle,
            currency:     'INR',
          },
        },
      });

      if (!planPrice) {

        continue;
      }

      if (planPrice.REMOVED_PAYMENT_INFRAPlanId) {

        summary.push({ planCode: plan.code, cycle, rzpPlanId: planPrice.REMOVED_PAYMENT_INFRAPlanId, status: 'already_exists' });
        continue;
      }

      // Create Razorpay plan

      let rzpPlan: any;

      try {
        rzpPlan = await (REMOVED_PAYMENT_INFRA.plans as any).create({
          period:   rzpCfg.period,
          interval: rzpCfg.interval,
          item: {
            name:        `${plan.name} – ${cycle}`,
            amount:      paise,
            currency:    'INR',
            description: `MobiBix ${plan.name} ${cycle.toLowerCase()} subscription`,
          },
        });
      } catch (err: any) {
        console.error(`❌  Failed to create Razorpay plan for ${plan.code}/${cycle}: ${err.message}`);
        summary.push({ planCode: plan.code, cycle, rzpPlanId: '', status: `error: ${err.message}` });
        continue;
      }

      // Save REMOVED_PAYMENT_INFRAPlanId to PlanPrice
      await prisma.planPrice.update({
        where: { id: planPrice.id },
        data:  { REMOVED_PAYMENT_INFRAPlanId: rzpPlan.id },
      });


      summary.push({ planCode: plan.code, cycle, rzpPlanId: rzpPlan.id, status: 'created' });
    }
  }

  // Print results table



  console.table(summary);


  for (const row of summary.filter((r) => r.status === 'created')) {
    const key = row.cycle === 'MONTHLY' ? 'RAZORPAY_MONTHLY' : 'RAZORPAY_YEARLY';

  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
