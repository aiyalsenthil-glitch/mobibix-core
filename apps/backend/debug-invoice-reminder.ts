
import 'dotenv/config';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cml6m2qik00006gle3a3hcduk';
  const customerId = 'cml6m48q500046gleyf9woins';
  
  console.log(`Checking reminders for Customer: ${customerId}, Tenant: ${tenantId}`);

  const reminders = await prisma.customerReminder.findMany({
    where: {
      tenantId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  console.log('Found Reminders:', JSON.stringify(reminders, null, 2));

  // Also check if any automation exists for invoice created
  const automations = await prisma.whatsAppAutomation.findMany({
    where: {
        moduleType: 'MOBILE_SHOP',
        eventType: 'INVOICE_CREATED'
    }
  });
  console.log('Invoice Automations:', JSON.stringify(automations, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
