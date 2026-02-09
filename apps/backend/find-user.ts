
const dotenv = require('dotenv');
dotenv.config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        role: 'OWNER',
        // shops: { some: {} } // Ensure they have a shop?
      },
      include: {
        userTenants: {
          include: { tenant: true }
        }
      }
    });

    if (user) {
      console.log('FOUND USER:', JSON.stringify(user, null, 2));
    } else {
      console.log('NO OWNER FOUND');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
