
import { PrismaClient } from '@prisma/client';
import { PERMISSION_INHERITANCE } from '../apps/backend/src/security/permission-inheritance';

const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Starting RBAC Migration...');

  const roles = await prisma.role.findMany({
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
    console.log(`Checking role: ${role.name}`);
    
    const currentPerms = role.rolePermissions.map(rp => 
      `${rp.permission.resource.name}.${rp.permission.action}`
    );

    const toAdd = new Set<string>();
    const toRemove = new Set<string>();

    for (const [basePerm, children] of Object.entries(PERMISSION_INHERITANCE)) {
      // If role has any child of this base permission, consider upgrading it to the base permission
      // OR if we want to be strict: if role has ALL children
      const hasSomeChildren = children.some(child => currentPerms.includes(child));
      
      if (hasSomeChildren) {
        console.log(`  Adding base permission: ${basePerm} to role: ${role.name}`);
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
      await prisma.$transaction(async (tx) => {
        // 1. Add new base permissions
        for (const baseStr of toAdd) {
          const [resName, actName] = baseStr.split('.');
          
          // Find or create the base permission in DB if it doesn't exist
          // First find resource
          let resource = await tx.resource.findFirst({
            where: { name: resName }
          });

          if (!resource) {
            // For base permissions we might need to create resource if it doesn't exist
            // This is a bit risky, usually seed should have done this
            console.warn(`    Warning: Resource ${resName} not found for base permission ${baseStr}`);
            continue;
          }

          const permission = await tx.permission.findFirst({
            where: { resourceId: resource.id, action: actName }
          });

          if (!permission) {
            console.warn(`    Warning: Permission ${actName} not found for resource ${resName}`);
            continue;
          }

          // Check if already mapped
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
           
           await tx.rolePermission.deleteMany({
             where: {
               roleId: role.id,
               permissionId: { in: permsToRemove.map(p => p.id) }
             }
           });
           console.log(`    Cleaned up ${permsToRemove.length} redundant granular permissions`);
        }
      });
    }
  }

  console.log('✅ Migration complete!');
}

migrate()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
