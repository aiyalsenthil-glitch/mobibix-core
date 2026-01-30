import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // WhatsAppTemplates mapping (must match DB)
  const WhatsAppTemplates = {
    WELCOME: 'new_member_welcome_v3',
    EXPIRY: 'membership_expiry_reminder',
    PAYMENT_DUE: 'payment_due_notice_util_v1',
  };

  // Check template existence
  const templateKeys = Object.values(WhatsAppTemplates);
  const foundTemplates = await prisma.whatsAppTemplate.findMany({
    where: {
      templateKey: { in: templateKeys },
      moduleType: 'GYM',
      status: 'ACTIVE',
    },
    select: { templateKey: true },
  });
  const foundSet = new Set(foundTemplates.map((t) => t.templateKey));

  // 1️⃣ NEW MEMBER WELCOME
  if (foundSet.has(WhatsAppTemplates.WELCOME)) {
    await prisma.whatsAppAutomation.upsert({
      where: {
        moduleType_eventType: {
          moduleType: 'GYM',
          eventType: 'MEMBER_CREATED',
        },
      },
      update: {
        templateKey: WhatsAppTemplates.WELCOME,
        offsetDays: 0,
        conditions: { set: null },
        enabled: true,
      },
      create: {
        moduleType: 'GYM',
        eventType: 'MEMBER_CREATED',
        templateKey: WhatsAppTemplates.WELCOME,
        offsetDays: 0,
        conditions: { set: null },
        enabled: true,
      },
    });
    console.log('✅ Seeded: NEW MEMBER WELCOME');
  } else {
    console.log('❌ Skipped: NEW MEMBER WELCOME (template missing)');
  }

  // 2️⃣ MEMBERSHIP EXPIRY REMINDER (BEFORE)
  if (foundSet.has(WhatsAppTemplates.EXPIRY)) {
    await prisma.whatsAppAutomation.upsert({
      where: {
        moduleType_eventType: {
          moduleType: 'GYM',
          eventType: 'MEMBERSHIP_EXPIRY',
        },
      },
      update: {
        templateKey: WhatsAppTemplates.EXPIRY,
        offsetDays: -3,
        conditions: [
          { field: 'expiryDate', operator: 'DAYS_BEFORE', value: 3 },
        ],
        enabled: true,
      },
      create: {
        moduleType: 'GYM',
        eventType: 'MEMBERSHIP_EXPIRY',
        templateKey: WhatsAppTemplates.EXPIRY,
        offsetDays: -3,
        conditions: [
          { field: 'expiryDate', operator: 'DAYS_BEFORE', value: 3 },
        ],
        enabled: true,
      },
    });
    console.log('✅ Seeded: MEMBERSHIP EXPIRY REMINDER (BEFORE)');
  } else {
    console.log('❌ Skipped: MEMBERSHIP EXPIRY REMINDER (template missing)');
  }

  // 3️⃣ PAYMENT DUE NOTICE (AFTER EXPIRY)
  if (foundSet.has(WhatsAppTemplates.PAYMENT_DUE)) {
    await prisma.whatsAppAutomation.upsert({
      where: {
        moduleType_eventType: {
          moduleType: 'GYM',
          eventType: 'MEMBERSHIP_EXPIRED',
        },
      },
      update: {
        templateKey: WhatsAppTemplates.PAYMENT_DUE,
        offsetDays: 1,
        conditions: [{ field: 'pendingAmount', operator: '>', value: 0 }],
        enabled: true,
      },
      create: {
        moduleType: 'GYM',
        eventType: 'MEMBERSHIP_EXPIRED',
        templateKey: WhatsAppTemplates.PAYMENT_DUE,
        offsetDays: 1,
        conditions: [{ field: 'pendingAmount', operator: '>', value: 0 }],
        enabled: true,
      },
    });
    console.log('✅ Seeded: PAYMENT DUE NOTICE (AFTER EXPIRY)');
  } else {
    console.log('❌ Skipped: PAYMENT DUE NOTICE (template missing)');
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
