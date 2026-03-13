import { PrismaClient } from '@prisma/client';
// @ts-ignore
import { PrismaPg } from '@prisma/adapter-pg';
// @ts-ignore
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const roles = await prisma.role.findMany({
    where: { isSystem: true, tenantId: null },
    include: {
      rolePermissions: {
        include: { permission: { include: { resource: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  for (const role of roles) {
    const perms = role.rolePermissions
      .map(
        (rp: any) =>
          `${rp.permission.resource.moduleType}.${rp.permission.resource.name}.${rp.permission.action}`,
      )
      .sort();
    console.log(`\n=== ${role.name} (${perms.length} permissions) ===`);
    perms.forEach((p: string) => console.log(`  ${p}`));
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
