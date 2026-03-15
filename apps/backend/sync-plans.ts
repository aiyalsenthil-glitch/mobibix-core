import Razorpay from 'REMOVED_PAYMENT_INFRA';
import * as dotenv from 'dotenv';
import { PrismaClient, BillingCycle } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

const REMOVED_PAYMENT_INFRA = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

async function main() {
  console.log(`Using Key: ${process.env.RAZORPAY_KEY_ID}`);
  try {
    const plans: any = await REMOVED_PAYMENT_INFRA.plans.all({ count: 100 });
    console.log('--- Razorpay Plans List ---');
    
    for (const item of plans.items) {
      console.log(`ID: ${item.id}, Name: ${item.item.name}, Amount: ${item.item.amount}, Period: ${item.period}, Interval: ${item.interval}`);
    }

    // Now let's try to automatically update the DB
    const dbPlans = await prisma.plan.findMany({ select: { id: true, name: true, code: true } });
    
    for (const rzpPlan of plans.items) {
      const name = rzpPlan.item.name;
      // Typical name: MOBIBIX_STANDARD_MONTHLY
      const parts = name.split('_');
      if (parts.length < 2) continue;

      const cycleStr = parts[parts.length - 1];
      const codeBase = parts.slice(0, -1).join('_'); // e.g., MOBIBIX_STANDARD

      let billingCycle: BillingCycle | null = null;
      if (cycleStr === 'MONTHLY') billingCycle = BillingCycle.MONTHLY;
      if (cycleStr === 'QUARTERLY') billingCycle = BillingCycle.QUARTERLY;
      if (cycleStr === 'YEARLY') billingCycle = BillingCycle.YEARLY;

      if (!billingCycle) continue;

      // Find the plan in DB
      const plan = dbPlans.find(p => p.code === codeBase);
      if (plan) {
        console.log(`Updating DB for ${plan.code} @ ${billingCycle} -> ${rzpPlan.id}`);
        await prisma.planPrice.updateMany({
          where: {
            planId: plan.id,
            billingCycle: billingCycle,
          },
          data: {
            REMOVED_PAYMENT_INFRAPlanId: rzpPlan.id
          }
        });
      }
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
