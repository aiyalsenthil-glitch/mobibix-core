import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const role = await prisma.role.findFirst({
        where: { name: 'SHOP_MANAGER' },
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
        console.log('Role not found');
        return;
    }

    console.log(`Role: ${role.name} (${role.id})`);
    const perms = role.rolePermissions.map((rp: any) => 
        `${rp.permission.resource.moduleType}.${rp.permission.resource.name}.${rp.permission.action}`
    );
    console.log('Perms count:', perms.length);
    console.log('Has core.billing.view?', perms.includes('CORE.billing.view'));
    console.log('Has mobile_shop.crm.view?', perms.includes('MOBILE_SHOP.crm.view'));
}
main().catch(console.error).finally(() => prisma.$disconnect());
