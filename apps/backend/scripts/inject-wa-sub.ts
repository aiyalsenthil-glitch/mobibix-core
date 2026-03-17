
import { PrismaClient, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmrfiz9x0004oj22u62jipnb';
  const planId = '07fdc7e0-96a0-4eb4-8f59-d1cbe08580f6'; // WA_OFFICIAL_BUSINESS
  const module = 'WHATSAPP_CRM';

  console.log(`Injecting WA Official Business for tenant ${tenantId}...`);

  // Start date today, end date 1 year from now
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  // Deactivate existing subscriptions for this module
  await prisma.tenantSubscription.updateMany({
    where: {
      tenantId,
      module: module as any,
    },
    data: {
      status: SubscriptionStatus.EXPIRED,
    },
  });

  // Create new active subscription
  const sub = await prisma.tenantSubscription.create({
    data: {
      tenantId,
      planId,
      module: module as any,
      status: SubscriptionStatus.ACTIVE,
      startDate,
      endDate,
    },
  });

  console.log('Subscription injected:', JSON.stringify(sub, null, 2));

  // Also enable whatsappCrmEnabled in Tenant model
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { whatsappCrmEnabled: true }
  });
  console.log('WhatsApp CRM enabled for tenant');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
