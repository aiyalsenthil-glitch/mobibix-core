import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, tenantType: true }
    });

    console.log('Recent Tenants:');
    tenants.forEach(t => console.log(`- ${t.name} (${t.tenantType}) ID: ${t.id}`));
}

main().finally(() => prisma.$disconnect());
