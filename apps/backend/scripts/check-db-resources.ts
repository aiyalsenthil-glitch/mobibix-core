import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const resources = await prisma.resource.findMany({
        select: { name: true, moduleType: true }
    });
    console.log(JSON.stringify(resources, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
