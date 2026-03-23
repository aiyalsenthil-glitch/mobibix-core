
import { PrismaClient, Prisma } from '@prisma/client';
import { PERMISSION_INHERITANCE } from '../../security/permission-inheritance';

const prisma = new PrismaClient();

async function migrate() {


  const roles = await prisma.role.findMany({
    where: { deletedAt: null },
    include: {
      rolePermissions: {
        include: {
          permission: {
            include: { resource: true }
          }
        }
      }
    }
  });

  for (const role of roles) {

    
    const currentPerms = role.rolePermissions.map((rp: any) => 
      `${rp.permission.resource.name}.${rp.permission.action}`
    );

    const toAdd = new Set<string>();
    const toRemove = new Set<string>();

    for (const [basePerm, children] of Object.entries(PERMISSION_INHERITANCE)) {
      // If role has any child of this base permission, consider upgrading it to the base permission
      const hasSomeChildren = children.some(child => currentPerms.includes(child));
      
      if (hasSomeChildren) {
        toAdd.add(basePerm);
        
        // Mark children for removal to clean up
        children.forEach(child => {
          if (currentPerms.includes(child)) {
            toRemove.add(child);
          }
        });
      }
    }

    if (toAdd.size > 0) {

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Add new base permissions
        for (const baseStr of toAdd) {
          const [resName, actName] = baseStr.split('.');
          
          let resource = await tx.resource.findFirst({
            where: { name: resName }
          });

          if (!resource) {

            continue;
          }

          const permission = await tx.permission.findFirst({
            where: { resourceId: resource.id, action: actName }
          });

          if (!permission) {

            continue;
          }

          const existing = await tx.rolePermission.findFirst({
            where: { roleId: role.id, permissionId: permission.id }
          });

          if (!existing) {
             await tx.rolePermission.create({
              data: { roleId: role.id, permissionId: permission.id }
            });

          }
        }

        // 2. Remove redundant granular permissions
        if (toRemove.size > 0) {
           const permsToRemove = await tx.permission.findMany({
             where: {
               OR: Array.from(toRemove).map(str => {
                 const [r, a] = str.split('.');
                 return { action: a, resource: { name: r } };
               })
             }
           });
           
           const deletedCount = await tx.rolePermission.deleteMany({
             where: {
               roleId: role.id,
               permissionId: { in: permsToRemove.map((p: any) => p.id) }
             }
           });

        }
      });
    }
  }


}

migrate()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
