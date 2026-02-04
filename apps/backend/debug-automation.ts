
import 'dotenv/config'; // Load .env file
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking WhatsApp Automations...');
  try {
    const automations = await prisma.whatsAppAutomation.findMany({
      where: {
        moduleType: 'MOBILE_SHOP',
      },
    });

    console.log('Refreshed automations:', JSON.stringify(automations, null, 2));
  } catch (err) {
    console.error('Error querying automations:', err);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
