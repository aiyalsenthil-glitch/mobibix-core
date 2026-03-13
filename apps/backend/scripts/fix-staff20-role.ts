import { PrismaClient, UserRole } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const email = 'staff20@gmail.com';
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
        console.log('User not found');
        return;
    }

    // 1. Update UserTenant role to MANAGER
    const ut = await prisma.userTenant.updateMany({
        where: { userId: user.id },
        data: { role: UserRole.MANAGER }
    });
    console.log('Updated UserTenant:', ut.count);

    // 2. Update User fullName and Role to MANAGER
    await prisma.user.update({
        where: { id: user.id },
        data: { 
            fullName: 'Aiyal Manager',
            role: UserRole.MANAGER
        }
    });

    // 3. Find SHOP_MANAGER role
    const managerRole = await prisma.role.findFirst({ where: { name: 'SHOP_MANAGER' } });
    if (managerRole) {
        // Update ShopStaff to use the correct role template
        const ss = await prisma.shopStaff.updateMany({
            where: { userId: user.id },
            data: { 
                roleId: managerRole.id,
                role: UserRole.MANAGER 
            }
        });
        console.log('Updated ShopStaff:', ss.count);
    }

    console.log('Fix complete for staff20@gmail.com');
}

main().catch(console.error).finally(() => prisma.$disconnect());
