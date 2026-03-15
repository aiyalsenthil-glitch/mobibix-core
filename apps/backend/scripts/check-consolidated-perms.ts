import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPermissions(userId: string, tenantId: string) {
  const shopStaffs = await prisma.shopStaff.findMany({
    where: { userId, tenantId, isActive: true, deletedAt: null },
    include: {
      dynamicRole: {
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
      }
    }
  });

  const allPerms = new Set<string>();
  shopStaffs.forEach(staff => {
    console.log(`\nShop: ${staff.shopId}, Role: ${staff.dynamicRole?.name}`);
    staff.dynamicRole?.rolePermissions.forEach(rp => {
      const p = `${rp.permission.resource.moduleType.toLowerCase()}.${rp.permission.resource.name}.${rp.permission.action}`;
      allPerms.add(p);
    });
  });

  console.log('\nConsolidated Permissions:');
  console.log(JSON.stringify(Array.from(allPerms).sort(), null, 2));
}

const USER_ID = '46f3c5c7-35e9-4393-abaa-029059becf33';
const TENANT_ID = 'cmmf1d9rq0008levotuo1ydee';

checkPermissions(USER_ID, TENANT_ID).catch(console.error);
