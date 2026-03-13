import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userId = '42e6c927-09dc-4dca-be6f-5f050e4aeace';
    console.log(`Checking user: ${userId}`);
    
    const user: any = await prisma.user.findUnique({
        where: { id: userId },
        include: {
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

    for (const ss of user.shopStaffs) {
        console.log(` - ShopID: ${ss.shopId}, role: ${ss.dynamicRole?.name}`);
        if (ss.dynamicRole) {
            const perms = ss.dynamicRole.rolePermissions.map((rp: any) => 
                `${rp.permission.resource.moduleType}.${rp.permission.resource.name}.${rp.permission.action}`
            );
            console.log('Perms:', perms);
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
