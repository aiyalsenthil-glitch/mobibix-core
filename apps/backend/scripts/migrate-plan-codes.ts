import { PrismaClient } from '../generated/prisma/client';

async function main() {
  const prisma = new PrismaClient({} as any);

  try {
    console.log('Updating Plan records with code field...');

    // Update code field to match name (UPPERCASED)
    const updated = await prisma.$executeRawUnsafe(`
      UPDATE "Plan" 
      SET code = UPPER(name) 
      WHERE code IS NULL OR code = '';
    `);

    console.log(`✅ Updated ${updated} plans`);

    // Verify using raw query
    const plans: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, name, code, "maxMembers", "memberLimit" FROM "Plan";
    `);

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
