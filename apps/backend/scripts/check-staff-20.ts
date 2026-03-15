import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const email = 'staff20@gmail.com';
    console.log(`Checking user: ${email}`);
    
    const user: any = await prisma.user.findFirst({
        where: { email },
        include: {
            userTenants: true,
            shopStaffs: {
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
            }
        }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`User ID: ${user.id}`);
    console.log('UserTenants:', user.userTenants.map((ut: any) => ({ tenantId: ut.tenantId, role: ut.role, isSystemOwner: ut.isSystemOwner })));
    
    for (const ss of user.shopStaffs) {
        console.log(` - ShopID: ${ss.shopId}, role: ${ss.dynamicRole?.name} (ID: ${ss.dynamicRole?.id})`);
        if (ss.dynamicRole) {
            const perms = ss.dynamicRole.rolePermissions.map((rp: any) => 
                `${rp.permission.resource.moduleType}.${rp.permission.resource.name}.${rp.permission.action}`
            );
            console.log('Perms count:', perms.length);
            const needed = ['CORE.billing.view', 'MOBILE_SHOP.crm.view', 'MOBILE_SHOP.shop.view'];
            needed.forEach(n => {
                if (perms.includes(n)) {
                    console.log(`✅ FOUND ${n}`);
                } else {
                    console.log(`❌ MISSING ${n}`);
                }
            });
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
