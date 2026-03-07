
import { PrismaClient, SubscriptionStatus, ModuleType } from '@prisma/client';
import { addDays, addYears } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmf1d9rq0008levotuo1ydee';
  console.log('Checking subscriptions for tenant:', tenantId);

  const subs = await prisma.tenantSubscription.findMany({
    where: { tenantId }
  });

  console.log('Found subscriptions:', JSON.stringify(subs, null, 2));

  // Fix: Create or update to a 1-year PRO subscription
  const now = new Date();
  const endDate = addYears(now, 1);

  await prisma.tenantSubscription.deleteMany({ where: { tenantId } });

  const newSub = await prisma.tenantSubscription.create({
    data: {
      tenantId,
      planId: '8e0df4ed-b28f-4c76-b492-7da2db25833b',
      status: SubscriptionStatus.ACTIVE,
      startDate: now,
      endDate: endDate,
    }
  });

  console.log('Created new active subscription:', newSub);
}

main().catch(console.error).finally(() => prisma.$disconnect());
