import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const roles = ['SHOP_MANAGER', 'TECHNICIAN', 'SHOP_ACCOUNTANT'];
    
    for (const roleName of roles) {
        const role = await prisma.role.findFirst({
            where: { name: roleName },
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

        if (!role) {
            console.log(`Role ${roleName} not found`);
            continue;
        }

        const perms = role.rolePermissions.map((rp: any) => 
            `${rp.permission.resource.moduleType.toLowerCase()}.${rp.permission.resource.name.toLowerCase()}.${rp.permission.action.toLowerCase()}`
        );
        
        console.log(`\n=== Permissions for ${roleName} ===`);
        console.log(`Total: ${perms.length}`);
        
        // Group by module for readability
        const modules = [...new Set(perms.map(p => p.split('.')[1]))];
        modules.sort().forEach(m => {
            const modPerms = perms.filter(p => p.split('.')[1] === m).sort();
            console.log(` [${m}]`);
            modPerms.forEach(p => console.log(`   - ${p}`));
        });
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
