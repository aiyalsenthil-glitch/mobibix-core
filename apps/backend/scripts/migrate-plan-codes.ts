import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient({} as any);

  try {
    console.log('Updating Plan records with code field...');

    // ✅ SECURITY FIX: Use $executeRaw with template literal
    const updated = await prisma.$executeRaw`
      UPDATE "Plan" 
      SET code = UPPER(name) 
      WHERE code IS NULL OR code = ''
    `;

    console.log(`✅ Updated ${updated} plans`);

    // ✅ SECURITY FIX: Use $queryRaw with template literal
    const plans: any[] = await prisma.$queryRaw`
      SELECT id, name, code, "maxMembers", "memberLimit" 
      FROM "Plan"
    `;

    console.log('\nCurrent plans:');
    console.table(plans);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
