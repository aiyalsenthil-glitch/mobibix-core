import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, ReminderStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find FAILED reminders for MOBILE_SHOP tenants
  const failedReminders = await prisma.customerReminder.findMany({
    where: {
      status: ReminderStatus.FAILED,
      channel: 'WHATSAPP',
      tenant: {
        tenantType: 'MOBILE_SHOP',
      },
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          tenantType: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
    take: 10,
    orderBy: { updatedAt: 'desc' },
  });

  console.log(
    `\n📊 Found ${failedReminders.length} FAILED MOBILE_SHOP reminders:\n`,
  );

  for (const reminder of failedReminders) {
    console.log(`ID: ${reminder.id}`);
    console.log(
      `  Tenant: ${reminder.tenant?.name} (${reminder.tenant?.tenantType})`,
    );
    console.log(
      `  Customer: ${reminder.customer?.name} - ${reminder.customer?.phone}`,
    );
    console.log(`  Template: ${reminder.templateKey}`);
    console.log(`  Status: ${reminder.status}`);
    console.log(`  Created: ${reminder.createdAt}`);
    console.log(`  Updated: ${reminder.updatedAt}`);
    console.log('');
  }

  // Ask to reset one reminder to SCHEDULED for testing
  if (failedReminders.length > 0) {
    const reminderToReset = failedReminders[0];
    console.log(
      `\n🔄 Resetting reminder ${reminderToReset.id} to SCHEDULED for testing...\n`,
    );

    await prisma.customerReminder.update({
      where: { id: reminderToReset.id },
      data: {
        status: ReminderStatus.SCHEDULED,
        scheduledAt: new Date(Date.now() + 5000), // Schedule 5 seconds from now
        sentAt: null,
      },
    });

    console.log(`✅ Reminder ${reminderToReset.id} reset to SCHEDULED`);
    console.log(`   Will be processed in ~5 seconds by the cron job`);
    console.log(
      `   Watch the logs for: [DEBUG] Reminder ${reminderToReset.id}`,
    );
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
