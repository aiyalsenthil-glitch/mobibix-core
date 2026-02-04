
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const automations = await prisma.whatsAppAutomation.findMany({
    select: {
      id: true,
      templateKey: true,
      eventType: true,
      moduleType: true,
      enabled: true,
    },
  });

  console.log('--- WhatsApp Automations ---');
  console.table(automations);
  
  // Also check if there's any template with 'job' in the name
  const jobTemplates = await prisma.whatsAppTemplate.findMany({
      where: {
          OR: [
              { templateKey: { contains: 'job', mode: 'insensitive' } },
              { metaTemplateName: { contains: 'job', mode: 'insensitive' } }
          ]
      },
      select: {
          id: true,
          templateKey: true,
          metaTemplateName: true,
          variables: true
      }
  });

  console.log('\n--- Job Related Templates ---');
  console.table(jobTemplates.map(t => ({...t, variables: JSON.stringify(t.variables)})));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
