import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mapping = [
  // Mobibix Pro
  { code: 'MOBIBIX_PRO', cycle: 'MONTHLY', rzpId: 'plan_SHBS7oI1veoGlY' },
  { code: 'MOBIBIX_PRO', cycle: 'QUARTERLY', rzpId: 'plan_SHBUe12IEyECwq' },
  { code: 'MOBIBIX_PRO', cycle: 'YEARLY', rzpId: 'plan_SHBU6VWrCKq5m4' },

  // Mobibix Standard
  { code: 'MOBIBIX_STANDARD', cycle: 'MONTHLY', rzpId: 'plan_SHBR5Wloh9IpvS' },
  { code: 'MOBIBIX_STANDARD', cycle: 'QUARTERLY', rzpId: 'plan_SHBR0tMAfnvz1P' },
  { code: 'MOBIBIX_STANDARD', cycle: 'YEARLY', rzpId: 'plan_SHBRhzJtBLtjnK' },

  // GymPilot Pro
  { code: 'GYM_PRO', cycle: 'MONTHLY', rzpId: 'plan_SHBQ79swgdys0w' },
  { code: 'GYM_PRO', cycle: 'QUARTERLY', rzpId: 'plan_SHBQRsgv145eT3' },
  { code: 'GYM_PRO', cycle: 'YEARLY', rzpId: 'plan_SHBQkjqOEiBFMV' },

  // GymPilot Standard
  { code: 'GYM_STANDARD', cycle: 'MONTHLY', rzpId: 'plan_SHBOsZJTYHebiW' },
  { code: 'GYM_STANDARD', cycle: 'QUARTERLY', rzpId: 'plan_SHBPLvynxI8DHm' },
  { code: 'GYM_STANDARD', cycle: 'YEARLY', rzpId: 'plan_SHBPmj5c3CvVIf' },
];

async function main() {
  console.log('Starting Razorpay Plan ID mapping...');

  for (const item of mapping) {
    const plan = await prisma.plan.findFirst({
      where: { code: item.code }
    });

    if (!plan) {
      console.warn(`Plan with code ${item.code} not found!`);
      continue;
    }

    const updated = await prisma.planPrice.updateMany({
      where: {
        planId: plan.id,
        billingCycle: item.cycle as any
      },
      data: {
        REMOVED_PAYMENT_INFRAPlanId: item.rzpId
      }
    });

    console.log(`Mapped ${item.code} (${item.cycle}) -> ${item.rzpId} (${updated.count} rows)`);
  }

  console.log('Mapping complete!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
