import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    take: 2,
    select: {
      id: true,
      code: true,
      name: true,
      userTenants: {
        select: {
          id: true,
          userId: true,
          role: true,
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        take: 1
      }
    }
  });

  fs.writeFileSync('test-data.json', JSON.stringify(tenants, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
