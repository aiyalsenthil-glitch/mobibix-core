import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { PrismaClient, ModuleType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function getSystemRoles() {
  const roles = await prisma.role.findMany({
    where: { tenantId: null, isSystem: true },
  });
  
  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    roleMap[r.name] = r.id;
  }
  return roleMap;
}

function mapLegacyRoleToSystemRole(legacyRole: string, moduleType: ModuleType): string {
  switch (legacyRole) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
    case 'OWNER':
      return 'OWNER'; // Global Owner root access
      
    case 'MANAGER':
      return moduleType === ModuleType.GYM ? 'GYM_MANAGER' : 'SHOP_MANAGER';
      
    case 'STAFF':
    case 'USER':
    default:
      return moduleType === ModuleType.GYM ? 'GYM_TRAINER' : 'SHOP_STAFF';
  }
}

async function migrateLegacyRoles() {
  console.log('🚀 Starting legacy role data migration to Enterprise Roles...');
  
  const systemRoles = await getSystemRoles();
  
  if (!systemRoles['OWNER'] || !systemRoles['SHOP_MANAGER'] || !systemRoles['GYM_MANAGER']) {
    throw new Error('System Roles not found! Did you run the seed script first?');
  }

  // 1. Migrate UserTenant (System Owners)
  console.log('\n--- 1. Migrating UserTenant (Owners) ---');
  const userTenants = await prisma.userTenant.findMany({
    where: { 
       role: { in: ['SUPER_ADMIN', 'ADMIN', 'OWNER'] },
       isSystemOwner: false // Only update ones we haven't touched
    }
  });

  if (userTenants.length > 0) {
    const result = await prisma.userTenant.updateMany({
      where: {
        id: { in: userTenants.map(ut => ut.id) }
      },
      data: {
        isSystemOwner: true
      }
    });
    console.log(`✅ Marked ${result.count} UserTenants as isSystemOwner: true`);
  } else {
    console.log('✅ No pending UserTenant owner migrations found.');
  }

  // 2. Migrate ShopStaff (Role Assignments)
  console.log('\n--- 2. Migrating ShopStaff (Role Mapping) ---');
  const shopStaff = await prisma.shopStaff.findMany({
    where: { roleId: null }, // Only migrate unmapped staff
    include: {
      tenant: { select: { enabledModules: true } } 
    }
  });

  let shopStaffMigrated = 0;
  for (const staff of shopStaff) {
    // Determine module context. 
    // Fall back to GYM if GYM is enabled, else MOBILE_SHOP
    const enabledModules = staff.tenant?.enabledModules || [];
    const moduleType = enabledModules.includes(ModuleType.GYM) ? ModuleType.GYM : ModuleType.MOBILE_SHOP; 
    
    const mappedSystemRoleName = mapLegacyRoleToSystemRole(staff.role, moduleType);
    const mappedRoleId = systemRoles[mappedSystemRoleName];

    if (!mappedRoleId) {
      console.warn(`⚠️ Warning: Could not find system role ID for ${mappedSystemRoleName} (Legacy: ${staff.role})`);
      continue;
    }

    await prisma.shopStaff.update({
      where: { id: staff.id },
      data: { roleId: mappedRoleId }
    });
    shopStaffMigrated++;
  }
  console.log(`✅ Migrated ${shopStaffMigrated} ShopStaff records to dynamic Role IDs.`);

  // 3. Migrate StaffInvites
  console.log('\n--- 3. Migrating StaffInvites (Role Mapping) ---');
  const invites = await prisma.staffInvite.findMany({
    where: { roleId: null }
  });

  let invitesMigrated = 0;
  for (const invite of invites) {
    // For invites without clear module context, default to Shop Staff, or we can look up Tenant if needed.
    // For simplicity, defaulting to Shop if unknown.
    const mappedSystemRoleName = mapLegacyRoleToSystemRole(invite.role, ModuleType.MOBILE_SHOP); 
    const mappedRoleId = systemRoles[mappedSystemRoleName];

    if (!mappedRoleId) continue;

    await prisma.staffInvite.update({
      where: { id: invite.id },
      data: { roleId: mappedRoleId }
    });
    invitesMigrated++;
  }
  console.log(`✅ Migrated ${invitesMigrated} StaffInvite records to dynamic Role IDs.`);

  console.log('\n🎉 Legacy Role Data Migration Complete! 🎉');
  console.log('You can now safely drop the legacy `role` columns in Phase 2/3.');
}

migrateLegacyRoles()
  .catch((e) => {
    console.error('❌ Migration Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
