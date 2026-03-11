import { PrismaClient } from '@prisma/client';

async function checkRoles() {
    const p = new PrismaClient();
    const systemRoles = await p.role.findMany({ where: { isSystem: true, tenantId: null } });
    console.log("ALL SYSTEM ROLES IN DB:");
    for (const r of systemRoles) {
        console.log(`- ${r.name} (deletedAt: ${r.deletedAt})`);
    }
    
    // forcefully HARD DELETE all legacy roles
    const keepNames = [
        'SHOP_OWNER', 'SHOP_MANAGER', 'SALES_EXECUTIVE', 'TECHNICIAN', 'SHOP_ACCOUNTANT',
        'GYM_OWNER', 'GYM_MANAGER', 'RECEPTIONIST', 'TRAINER', 'GYM_ACCOUNTANT'
    ];
    
    console.log("Hard deleting legacy roles...");
    const result = await p.role.deleteMany({
        where: {
            isSystem: true,
            tenantId: null,
            name: { notIn: keepNames }
        }
    });
    console.log("Deleted count:", result.count);
    await p.$disconnect();
}
checkRoles();
