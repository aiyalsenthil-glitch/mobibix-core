import { PrismaClient } from '@prisma/client';

async function checkRoles() {
  const prisma = new PrismaClient();
  try {
    const roles = await prisma.role.findMany({
      where: {
        tenantId: null,
      },
      select: {
        name: true,
        isSystem: true,
        category: true,
        deletedAt: true,
      }
    });
    console.log(JSON.stringify(roles, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

checkRoles();
