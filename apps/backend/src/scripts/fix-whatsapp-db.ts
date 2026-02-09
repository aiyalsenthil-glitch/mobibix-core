import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixWhatsAppNumber() {
  const phoneNumberId = '879797545226831';
  const tenantType = 'MOBILE_SHOP';

  console.log('🔍 Checking for tenant with MOBILE_SHOP...');

  const tenant = await prisma.tenant.findFirst({
    where: {
      tenantType: tenantType,
    },
  });

  if (!tenant) {
    console.error('❌ No tenant found with tenantType = MOBILE_SHOP');
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name} (${tenant.id})`);

  console.log(`🛠 Upserting WhatsAppPhoneNumber for ${phoneNumberId}...`);

  await prisma.whatsAppPhoneNumber.upsert({
    where: {
      tenantId_phoneNumberId: {
        tenantId: tenant.id,
        phoneNumberId: phoneNumberId,
      },
    },
    update: {
      isActive: true,
      purpose: 'DEFAULT',
      wabaId: process.env.WHATSAPP_WABA_ID || '725808986859936',
    },
    create: {
      tenantId: tenant.id,
      phoneNumberId: phoneNumberId,
      phoneNumber: '918797545226', // Mock/Placeholder if not known
      wabaId: process.env.WHATSAPP_WABA_ID || '725808986859936',
      isActive: true,
      purpose: 'DEFAULT',
    },
  });

  console.log('✅ WhatsAppPhoneNumber record fixed!');

  // Also verify WhatsAppLog existence for test
  const logCount = await prisma.whatsAppLog.count();
  console.log(`📊 Total WhatsApp Logs: ${logCount}`);
}

fixWhatsAppNumber()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
