import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Fix eventType naming inconsistency: spaces → underscores
 *
 * Problem: Database has "JOB READY" but code emits "JOB_READY"
 * Solution: Normalize all event types to use underscores
 */
async function fixEventTypeNaming() {


  // Map of incorrect → correct event types
  const eventTypeMapping: Record<string, string> = {
    'JOB READY': 'JOB_READY',
    'JOB COMPLETED': 'JOB_COMPLETED',
    'JOB DELIVERED': 'JOB_DELIVERED',
    'JOB CREATED': 'JOB_CREATED',
    'INVOICE CREATED': 'INVOICE_CREATED',
    'INVOICE PAID': 'INVOICE_PAID',
    'PAYMENT DUE': 'PAYMENT_DUE',
    'PAYMENT PENDING': 'PAYMENT_PENDING',
    'FOLLOW UP SCHEDULED': 'FOLLOW_UP_SCHEDULED',
    'FOLLOW UP OVERDUE': 'FOLLOW_UP_OVERDUE',
    'FOLLOW UP COMPLETED': 'FOLLOW_UP_COMPLETED',
  };

  // Find all automations with spaces in eventType
  const automations = await prisma.whatsAppAutomation.findMany({
    where: {
      eventType: {
        contains: ' ', // Has space
      },
    },
  });

  console.log(
    `Found ${automations.length} automations with spaces in eventType\n`,
  );

  if (automations.length === 0) {

    return;
  }

  // Display what will be updated
  for (const automation of automations) {
    const correctedType =
      eventTypeMapping[automation.eventType] ||
      automation.eventType.replace(/\s+/g, '_');
    console.log(
      `  📝 "${automation.eventType}" → "${correctedType}" (Template: ${automation.templateKey})`,
    );
  }



  // Update each automation
  let updatedCount = 0;
  for (const automation of automations) {
    const correctedType =
      eventTypeMapping[automation.eventType] ||
      automation.eventType.replace(/\s+/g, '_');

    await prisma.whatsAppAutomation.update({
      where: { id: automation.id },
      data: { eventType: correctedType },
    });

    updatedCount++;

  }


}

fixEventTypeNaming()
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
