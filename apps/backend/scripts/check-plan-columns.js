require('dotenv').config({ path: 'apps/backend/.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(){
  console.log('Checking Plan table columns...');
  const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Plan' ORDER BY ordinal_position;`;
  console.log(cols);
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
