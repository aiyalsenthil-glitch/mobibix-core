import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixWhatsAppNumber() {
  const phoneNumberId = '879797545226831';
  const tenantType = 'MOBILE_SHOP';



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



  await prisma.whatsAppNumber.upsert({
    where: {
      phoneNumberId,
    },
    update: {
      isEnabled: true,
      purpose: 'DEFAULT',
      wabaId: process.env.WHATSAPP_WABA_ID || '725808986859936',
    },
    create: {
      tenantId: tenant.id,
      phoneNumberId: phoneNumberId,
      phoneNumber: '918797545226', // Mock/Placeholder if not known
      wabaId: process.env.WHATSAPP_WABA_ID || '725808986859936',
      isEnabled: true,
      purpose: 'DEFAULT',
    },
  });



  // Also verify WhatsAppLog existence for test
  const logCount = await prisma.whatsAppLog.count();

}

fixWhatsAppNumber()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
