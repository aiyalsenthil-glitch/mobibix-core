import { PrismaClient, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const subId = 'cmmeh98ap000kleisl90bz4q8';
  
  // Set end date to 1 hour ago
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 1);

  await prisma.tenantSubscription.update({
    where: { id: subId },
    data: {
      endDate: yesterday,
      autoRenew: true,
      status: SubscriptionStatus.ACTIVE
    }
  });

  console.log(`✅ Subscription ${subId} updated to expire at ${yesterday.toISOString()}`);
  console.log('Now eligible for auto-renewal cron.');
}

main().finally(() => prisma.$disconnect());
