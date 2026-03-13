import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userId = '42e6c927-09dc-4dca-be6f-5f050e4aeace';
    console.log(`Checking user: ${userId}`);
    
    const user: any = await prisma.user.findUnique({
        where: { id: userId },
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

    console.log('User Email:', user.email);
    console.log('User Tenants (count):', user.userTenants.length);
    for (const ut of user.userTenants) {
        console.log(` - TenantID: ${ut.tenantId}, isSystemOwner: ${ut.isSystemOwner}, legacyRole: ${ut.role}`);
    }

    console.log('Shop Staff assignments (count):', user.shopStaffs.length);
    for (const ss of user.shopStaffs) {
        console.log(` - ShopID: ${ss.shopId}, roleId: ${ss.roleId}, legacyRole: ${ss.role}`);
        if (ss.dynamicRole) {
            console.log(`   Dynamic Role: ${ss.dynamicRole.name} (isSystem: ${ss.dynamicRole.isSystem})`);
            const perms = ss.dynamicRole.rolePermissions.map((rp: any) => 
                `${rp.permission.resource.moduleType}.${rp.permission.resource.name}.${rp.permission.action}`
            );
            console.log(`   Permissions (${perms.length}):`, perms.slice(0, 10).join(', '), perms.length > 10 ? '...' : '');
            if (perms.includes('MOBILE_SHOP.shop.view')) {
                 console.log('✅ FOUND MOBILE_SHOP.shop.view');
            } else {
                 console.log('❌ MISSING MOBILE_SHOP.shop.view');
            }
        } else {
            console.log('   No dynamic role assigned!');
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
