import { PrismaClient } from '../generated/prisma/client';

async function main() {
  const prisma = new PrismaClient({} as any);
  try {
    const sql = `UPDATE "User" SET role = LOWER(role) WHERE role IS NOT NULL AND role <> LOWER(role);`;
    const result = await prisma.$executeRawUnsafe(sql);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
