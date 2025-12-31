import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { normalizePhone } from '../src/common/utils/phone.util';

const prisma = new PrismaClient();

async function run() {
  console.log('🔄 Normalizing member phone numbers...');

  const members = await prisma.member.findMany({
    select: { id: true, phone: true },
  });

  let updated = 0;

  for (const m of members) {
    if (!m.phone) continue;

    const normalized = normalizePhone(m.phone);

    if (normalized !== m.phone) {
      await prisma.member.update({
        where: { id: m.id },
        data: { phone: normalized },
      });
      updated++;
    }
  }

  console.log(`✅ Phone normalization completed. Updated: ${updated}`);
}

run()
  .catch((e) => {
    console.error('❌ Error normalizing phones', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
