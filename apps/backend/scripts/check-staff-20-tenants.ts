import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const email = 'staff20@gmail.com';
    const user: any = await prisma.user.findFirst({
        where: { email },
        include: {
            userTenants: true,
            shopStaffs: true
        }
    });

    if (!user) return;

    console.log('User ID:', user.id);
    console.log('UserTenants:', user.userTenants.map((ut: any) => ut.tenantId));
    console.log('ShopStaffs TenantIDs:', user.shopStaffs.map((ss: any) => ss.tenantId));
}
main().catch(console.error).finally(() => prisma.$disconnect());
