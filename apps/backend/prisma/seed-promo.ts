import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const code = 'RG-MB-01';

  const existing = await prisma.promoCode.findUnique({
    where: { code },
  });

  if (!existing) {
    await prisma.promoCode.create({
      data: {
        code,
        type: 'FREE_TRIAL',
        durationDays: 90,
        maxUses: 500,
        isActive: true,
        description: 'Launch Partner 90-Day Free Trial',
      },
    });
    console.log('✅ Seeded Promo Code: RG-MB-01');
  } else {
    console.log('ℹ️ Promo Code RG-MB-01 already exists');
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
