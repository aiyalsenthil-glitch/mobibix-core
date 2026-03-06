import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findFirst({
        where: { name: { contains: 'Repairguru', mode: 'insensitive' } },
        select: { id: true, name: true, tenantType: true }
    });

    if (tenant) {
        console.log('Tenant Record:', tenant);
    } else {
        console.log('Tenant not found');
    }
}

main().finally(() => prisma.$disconnect());
