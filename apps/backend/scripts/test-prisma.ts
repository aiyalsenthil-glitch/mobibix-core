import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Querying resources...');
        const res = await prisma.resource.findMany({ take: 5 });
        console.log('Results:', JSON.stringify(res, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
