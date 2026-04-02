import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient({} as any);
  try {
    // ✅ SECURITY FIX: Use $executeRaw with template literal
    const result = await prisma.$executeRaw`
      UPDATE "User" 
      SET role = LOWER(role) 
      WHERE role IS NOT NULL AND role <> LOWER(role)
    `;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
