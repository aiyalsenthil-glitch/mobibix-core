import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findFirst({
        where: { name: { contains: 'Repairguru', mode: 'insensitive' } },
        include: { subscription: true }
    });

    if (tenant) {
        console.log(`Tenant: ${tenant.name} (${tenant.id})`);
        tenant.subscription.forEach((s: any) => {
            console.log(`- Sub: ${s.id} | Status: ${s.status} | Auto: ${s.autoRenew} | End: ${s.endDate}`);
        });
    } else {
        console.log('Tenant not found');
    }
}

main().finally(() => prisma.$disconnect());
