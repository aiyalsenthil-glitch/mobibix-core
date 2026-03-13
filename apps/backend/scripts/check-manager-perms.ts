import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findFirst({
    where: { name: 'SHOP_MANAGER' },
    include: {
      rolePermissions: {
        include: {
          permission: {
            include: {
              resource: true
            }
          }
        }
      }
    }
  });

  if (!role) {
    console.log('Role not found');
    return;
  }

  console.log(`=== Permissions for ${role.name} ===`);
  const perms = role.rolePermissions.map(rp => `${rp.permission.resource.moduleType.toLowerCase()}.${rp.permission.resource.name}.${rp.permission.action}`);
  perms.sort().forEach(p => console.log(` - ${p}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
