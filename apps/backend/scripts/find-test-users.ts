import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.userTenant.findMany({
    take: 5,
    select: {
      userId: true,
      tenantId: true,
      role: true,
      user: {
        select: {
          id: true,
          email: true,
          REMOVED_AUTH_PROVIDERUid: true
        }
      },
      tenant: {
        select: {
          id: true,
          code: true
        }
      }
    }
  });

  fs.writeFileSync('test-users.json', JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
